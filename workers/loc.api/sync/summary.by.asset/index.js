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
    movements,
    wallets
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
    this.balanceHistory = balanceHistory
    this.FOREX_SYMBS = FOREX_SYMBS
    this.authenticator = authenticator
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.movements = movements
    this.wallets = wallets

    this.movementsMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.MOVEMENTS)
    this.movementsSymbolFieldName = this.movementsMethodColl.symbolFieldName
  }

  // TODO:
  async getSummaryByAsset (args) {
    const auth = await this.authenticator
      .verifyRequestUser({ auth: args?.auth ?? {} })
    const end = args?.end ?? Date.now()
    const start = moment.utc(end)
      .add(-30, 'days')
      .valueOf()

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
      withdrawals,
      deposits,
      startWallets,
      endWallets
    ] = await Promise.all([
      withdrawalsPromise,
      depositsPromise,
      startWalletsPromise,
      endWalletsPromise
    ])

    const res = this.#calcSummaryByAsset({
      withdrawals,
      deposits,
      startWallets,
      endWallets
    })

    // TODO: mock data
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

    return res
  }

  #calcSummaryByAsset ({
    withdrawals,
    deposits,
    startWallets,
    endWallets
  }) {
    const currencyRes = []
    const currencySet = new Set(...endWallets.map((wallet) => (
      wallet.currency
    )))

    for (const currency of currencySet) {
      const startWalletsForCurrency = startWallets.find((wallet) => (
        wallet.currency === currency
      )) ?? []
      const endWalletsForCurrency = endWallets.find((wallet) => (
        wallet.currency === currency
      )) ?? []

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

      const res = {
        currency,
        balance: calcedEndWalletbalance,
        balanceUsd: calcedEndWalletbalanceUsd,
        valueChange30dUsd
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
}

decorateInjectable(SummaryByAsset, depsTypes)

module.exports = SummaryByAsset
