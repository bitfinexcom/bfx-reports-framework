'use strict'

const moment = require('moment')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.SyncSchema,
  TYPES.BalanceHistory,
  TYPES.FOREX_SYMBS,
  TYPES.Authenticator,
  TYPES.SYNC_API_METHODS,
  TYPES.ALLOWED_COLLS,
  TYPES.Movements,
  TYPES.Wallets
]
class SummaryByAsset {
  constructor (
    dao,
    syncSchema,
    balanceHistory,
    FOREX_SYMBS,
    authenticator,
    SYNC_API_METHODS,
    ALLOWED_COLLS,
    movements,
    wallets
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
    this.balanceHistory = balanceHistory
    this.FOREX_SYMBS = FOREX_SYMBS
    this.authenticator = authenticator
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.movements = movements
    this.wallets = wallets

    this.movementsMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.MOVEMENTS)
    this.ledgersMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.LEDGERS)
    this.ledgersModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.LEDGERS)
    this.movementsSymbolFieldName = this.movementsMethodColl.symbolFieldName
    this.ledgersSymbolFieldName = this.ledgersMethodColl.symbolFieldName
  }

  // TODO:
  async getSummaryByAsset (args) {
    const auth = await this.authenticator
      .verifyRequestUser({ auth: args?.auth ?? {} })
    const end = args?.params?.end ?? Date.now()
    const start = moment.utc(end)
      .add(-30, 'days')
      .valueOf()

    const ledgersPromise = this.#getLedgers({
      auth,
      start,
      end
    })
    const withdrawalsPromise = this.movements.getMovements({
      auth,
      start,
      end,
      sort: [['mtsStarted', -1]],
      isWithdrawals: true
    })
    const depositsPromise = this.movements.getMovements({
      auth,
      start,
      end,
      sort: [['mtsUpdated', -1]],
      isDeposits: true
    })
    const startWalletsPromise = this.wallets.getWallets({
      auth,
      params: { end: start }
    })
    const endWalletsPromise = this.wallets.getWallets({
      auth,
      params: { end }
    })

    const [
      ledgers,
      withdrawals,
      deposits,
      startWallets,
      endWallets
    ] = await Promise.all([
      ledgersPromise,
      withdrawalsPromise,
      depositsPromise,
      startWalletsPromise,
      endWalletsPromise
    ])

    // TODO: Data example
    // [
    //   {
    //     currency: 'BTC',
    //     balance: 12.32,
    //     balanceUsd: 246_400,
    //     valueChange30dUsd: 246_400, // means the difference between the value 30 days ago and the current value
    //     result30dUsd: 246_400, // show the value change without the deposit/withdrawals
    //     volume30dUsd: 246_400 //  means traded, lended, funded volume for 30 days period
    //   }
    // ]
    const summaryByAsset = this.#calcSummaryByAsset({
      ledgers,
      withdrawals,
      deposits,
      startWallets,
      endWallets
    })
    // TODO: Data example
    const total = {
      balanceUsd: 246_400,
      valueChange30dUsd: 246_400,
      result30dUsd: 246_400
    }

    return {
      summaryByAsset,
      total
    }
  }

  #calcSummaryByAsset ({
    ledgers,
    withdrawals,
    deposits,
    startWallets,
    endWallets
  }) {
    const currencyRes = []
    const currencySet = new Set(endWallets.map((wallet) => (
      wallet.currency
    )))

    for (const currency of currencySet) {
      const startWalletsForCurrency = startWallets.filter((wallet) => (
        wallet.currency === currency
      ))
      const endWalletsForCurrency = endWallets.filter((wallet) => (
        wallet.currency === currency
      ))

      const calcedStartWalletbalance = this.#calcFieldByName(
        startWalletsForCurrency,
        'balance'
      )
      const calcedEndWalletbalance = this.#calcFieldByName(
        endWalletsForCurrency,
        'balance'
      )
      const calcedEndWalletbalanceUsd = this.#calcFieldByName(
        endWalletsForCurrency,
        'balanceUsd'
      )

      if (
        !Number.isFinite(calcedEndWalletbalance) ||
        !Number.isFinite(calcedEndWalletbalanceUsd) ||
        calcedEndWalletbalance === 0 ||
        calcedEndWalletbalanceUsd === 0
      ) {
        continue
      }

      const actualRate = calcedEndWalletbalanceUsd / calcedEndWalletbalance
      const valueChange30d = calcedEndWalletbalance - calcedStartWalletbalance
      const valueChange30dUsd = valueChange30d * actualRate
      const valueChange30dPerc = calcedStartWalletbalance === 0
        ? 0
        : (valueChange30d / calcedStartWalletbalance) * 100
      const calcedMovementsByCurrency = this.#calcMovementsByCurrency(
        { withdrawals, deposits },
        currency
      )
      const result30d = valueChange30d - calcedMovementsByCurrency
      const result30dUsd = (valueChange30d - calcedMovementsByCurrency) * actualRate
      const result30dPerc = calcedMovementsByCurrency === 0
        ? 0
        : (result30d / calcedMovementsByCurrency) * 100

      const res = {
        currency,
        balance: calcedEndWalletbalance,
        balanceUsd: calcedEndWalletbalanceUsd,
        valueChange30dUsd,
        valueChange30dPerc,
        result30dUsd,
        result30dPerc
      }

      currencyRes.push(res)
    }

    return currencyRes
  }

  #calcFieldByName (wallets, fieldName) {
    return wallets.reduce((accum, curr) => (
      Number.isFinite(curr?.[fieldName])
        ? accum + curr[fieldName]
        : accum
    ), 0)
  }

  #calcMovementsByCurrency (movements, currency) {
    const { withdrawals, deposits } = movements ?? {}

    const withdrawalsForCurrency = withdrawals.filter((item) => (
      item?.[this.movementsSymbolFieldName] === currency
    ))
    const depositsForCurrency = deposits.filter((item) => (
      item?.[this.movementsSymbolFieldName] === currency
    ))

    const calcedWithdrawals = this.#calcFieldByName(
      withdrawalsForCurrency,
      'amount'
    )
    const calcedDeposits = this.#calcFieldByName(
      depositsForCurrency,
      'amount'
    )

    return calcedWithdrawals + calcedDeposits
  }

  #getLedgers (args) {
    const {
      auth,
      start,
      end
    } = args ?? {}

    return this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.LEDGERS,
      {
        filter: {
          $lte: { mts: end },
          $gte: { mts: start },
          user_id: auth._id
        },
        sort: [['mts', 1], ['id', 1]],
        projection: this.ledgersModel
      }
    )
  }
}

decorateInjectable(SummaryByAsset, depsTypes)

module.exports = SummaryByAsset
