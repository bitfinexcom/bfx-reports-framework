'use strict'

const moment = require('moment')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.SyncSchema,
  TYPES.Authenticator,
  TYPES.SYNC_API_METHODS,
  TYPES.ALLOWED_COLLS,
  TYPES.Movements,
  TYPES.Wallets,
  TYPES.CurrencyConverter
]
class SummaryByAsset {
  constructor (
    dao,
    syncSchema,
    authenticator,
    SYNC_API_METHODS,
    ALLOWED_COLLS,
    movements,
    wallets,
    currencyConverter
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
    this.authenticator = authenticator
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.movements = movements
    this.wallets = wallets
    this.currencyConverter = currencyConverter

    this.movementsMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.MOVEMENTS)
    this.ledgersMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.LEDGERS)
    this.ledgersModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.LEDGERS)
    this.movementsSymbolFieldName = this.movementsMethodColl.symbolFieldName
    this.ledgersSymbolFieldName = this.ledgersMethodColl.symbolFieldName
  }

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

    const summaryByAsset = await this.#calcSummaryByAsset({
      start,
      ledgers,
      withdrawals,
      deposits,
      startWallets,
      endWallets
    })
    const total = this.#calcTotal(summaryByAsset)

    return {
      summaryByAsset,
      total
    }
  }

  async #calcSummaryByAsset ({
    start,
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
    const startRateMap = await this.#getStartRateMapByCandles(
      start,
      currencySet
    )

    for (const currency of currencySet) {
      const startRate = startRateMap.get(currency)
      const ledgersForCurrency = ledgers.filter((ledger) => (
        ledger[this.ledgersSymbolFieldName] === currency
      ))
      const exchangeLedgers = ledgersForCurrency.filter((ledger) => (
        ledger._category === 5
      ))
      const startWalletsForCurrency = startWallets.filter((wallet) => (
        wallet.currency === currency
      ))
      const endWalletsForCurrency = endWallets.filter((wallet) => (
        wallet.currency === currency
      ))

      const calcedExchangeLedgers = this.#calcFieldByName(
        exchangeLedgers,
        'amount'
      )
      const calcedExchangeProfitUsd = this.#calcExchangeProfitUsd(
        exchangeLedgers,
        startRate
      )
      const calcedVolume30d = this.#calcVolume30d(
        ledgersForCurrency
      )
      const calcedStartWalletBalance = this.#calcFieldByName(
        startWalletsForCurrency,
        'balance'
      )
      const calcedEndWalletBalance = this.#calcFieldByName(
        endWalletsForCurrency,
        'balance'
      )

      const calcedEndWalletBalanceUsd = this.#calcFieldByName(
        endWalletsForCurrency,
        'balanceUsd'
      )

      if (
        !Number.isFinite(calcedEndWalletBalance) ||
        !Number.isFinite(calcedEndWalletBalanceUsd) ||
        calcedEndWalletBalance === 0 ||
        calcedEndWalletBalanceUsd === 0
      ) {
        continue
      }

      const actualRate = currency === 'USD'
        ? 1
        : calcedEndWalletBalanceUsd / calcedEndWalletBalance
      const valueChange30d = calcedEndWalletBalance - calcedStartWalletBalance
      const valueChange30dUsd = valueChange30d * actualRate
      const valueChange30dPerc = calcedStartWalletBalance === 0
        ? 0
        : (valueChange30d / calcedStartWalletBalance) * 100
      const calcedMovementsByCurrency = this.#calcMovementsByCurrency(
        { withdrawals, deposits },
        currency
      )
      const result30d = (
        valueChange30d -
        calcedMovementsByCurrency -
        calcedExchangeLedgers
      )
      const result30dUsd = (result30d * (actualRate - startRate)) +
        calcedExchangeProfitUsd
      const result30dPerc = calcedStartWalletBalance === 0
        ? 0
        : (result30dUsd / (calcedStartWalletBalance * startRate)) * 100
      const volume30dUsd = calcedVolume30d * actualRate

      const res = {
        currency,
        balance: calcedEndWalletBalance,
        balanceUsd: calcedEndWalletBalanceUsd,
        valueChange30dUsd,
        valueChange30dPerc,
        result30dUsd,
        result30dPerc,
        volume30dUsd
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

  #calcVolume30d (ledgers) {
    return ledgers.reduce((accum, curr) => {
      const amount = curr?.amount

      if (!Number.isFinite(amount)) {
        return accum
      }

      return accum + Math.abs(amount)
    }, 0)
  }

  #calcExchangeProfitUsd (ledgers, startRate) {
    return ledgers.reduce((accum, curr) => {
      const amount = curr?.amount
      const amountUsd = curr?.amountUsd

      if (
        !Number.isFinite(amount) ||
        !Number.isFinite(amountUsd) ||
        amount > 0 // Take into account the sale
      ) {
        return accum
      }

      const profit = amountUsd - (amount * startRate)

      return accum + profit
    }, 0)
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

  #calcTotal (summaryByAsset) {
    const initTotal = {
      balanceUsd: 0,
      valueChange30dUsd: 0,
      valueChange30dPerc: 0, // TODO:
      result30dUsd: 0,
      result30dPerc: 0, // TODO:
      volume30dUsd: 0
    }

    return summaryByAsset.reduce((accum, curr) => {
      this.#calcObjPropsByName(
        accum,
        curr,
        [
          'balanceUsd',
          'valueChange30dUsd',
          'result30dUsd',
          'volume30dUsd'
        ]
      )

      return accum
    }, initTotal)
  }

  #calcObjPropsByName (accum, curr, propNames) {
    for (const propName of propNames) {
      accum[propName] = Number.isFinite(curr?.[propName])
        ? accum[propName] + curr[propName]
        : accum[propName]
    }
  }

  async #getStartRateMapByCandles (start, currencySet) {
    const startRates = await this.currencyConverter.convertByCandles(
      [...currencySet].map((ccy) => ({ ccy, multip: 1, rate: 0 })),
      {
        symbolFieldName: 'ccy',
        mts: start,
        convFields: [{ inputField: 'multip', outputField: 'rate' }]
      }
    )

    return new Map(startRates.map(({ ccy, rate }) => [ccy, rate]))
  }
}

decorateInjectable(SummaryByAsset, depsTypes)

module.exports = SummaryByAsset
