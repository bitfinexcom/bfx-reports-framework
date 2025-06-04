'use strict'

const { omit } = require('lib-js-util-base')
const moment = require('moment')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.SyncSchema,
  TYPES.Authenticator,
  TYPES.SYNC_API_METHODS,
  TYPES.ALLOWED_COLLS,
  TYPES.Wallets,
  TYPES.Trades
]
class SummaryByAsset {
  constructor (
    dao,
    syncSchema,
    authenticator,
    SYNC_API_METHODS,
    ALLOWED_COLLS,
    wallets,
    trades
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
    this.authenticator = authenticator
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.wallets = wallets
    this.trades = trades

    this.ledgersMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.LEDGERS)
    this.ledgersModelFields = this.syncSchema
      .getModelOf(this.ALLOWED_COLLS.LEDGERS)
      .getModelFields()
    this.ledgersSymbolFieldName = this.ledgersMethodColl
      .getModelField('SYMBOL_FIELD_NAME')
  }

  async getSummaryByAsset (args) {
    const auth = await this.authenticator
      .verifyRequestUser({ auth: args?.auth ?? {} })
    const end = args?.params?.end ?? Date.now()
    const mts30dUntilEnd = moment.utc(end)
      .add(-30, 'days')
      .valueOf()
    const start = args?.params?.start ?? mts30dUntilEnd

    const tradesPromise = this.trades.getTrades({
      auth,
      params: {
        start,
        end
      }
    })
    const ledgersPromise = this.#getLedgers({
      auth,
      start,
      end
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
      trades,
      ledgers,
      startWallets,
      endWallets
    ] = await Promise.all([
      tradesPromise,
      ledgersPromise,
      startWalletsPromise,
      endWalletsPromise
    ])

    const _summaryByAsset = await this.#calcSummaryByAsset({
      trades,
      ledgers,
      startWallets,
      endWallets
    })
    const total = this.#calcTotal(_summaryByAsset)
    const summaryByAsset = _summaryByAsset.map((item) => (
      omit(item, [
        'balanceChangeUsd',
        'tradingFeesUsd',
        'calcedStartWalletBalanceUsd'
      ])
    ))

    return {
      summaryByAsset,
      total
    }
  }

  async #calcSummaryByAsset ({
    trades,
    ledgers,
    startWallets,
    endWallets
  }) {
    const currencyRes = []
    const currencySet = new Set([
      ...ledgers.map((ledger) => (
        ledger?.currency
      )),
      ...endWallets.map((wallet) => (
        wallet?.currency
      ))
    ])

    for (const currency of currencySet) {
      const startWalletsForCurrency = startWallets.filter((wallet) => (
        wallet.currency === currency
      ))
      const endWalletsForCurrency = endWallets.filter((wallet) => (
        wallet.currency === currency
      ))

      const calcedStartWalletBalance = this.#calcFieldByName(
        startWalletsForCurrency,
        'balance'
      )
      const calcedStartWalletBalanceUsd = this.#calcFieldByName(
        startWalletsForCurrency,
        'balanceUsd'
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
        !Number.isFinite(calcedStartWalletBalance) ||
        !Number.isFinite(calcedStartWalletBalanceUsd) ||
        !Number.isFinite(calcedEndWalletBalance) ||
        !Number.isFinite(calcedEndWalletBalanceUsd)
      ) {
        continue
      }

      const calcedActualRate = calcedEndWalletBalance === 0
        ? 0
        : calcedEndWalletBalanceUsd / calcedEndWalletBalance
      const actualRate = currency === 'USD'
        ? 1
        : calcedActualRate

      const ledgersForCurrency = ledgers.filter((ledger) => (
        ledger[this.ledgersSymbolFieldName] === currency
      ))
      const tradesForCurrency = trades.filter((trade) => (
        trade?.baseCurrency === currency
      ))
      const marginFundingPaymentLedgers = ledgersForCurrency.filter((ledger) => (
        ledger._category === 28
      ))
      const tradingFeeLedgers = ledgersForCurrency.filter((ledger) => (
        ledger._category === 201
      ))

      const volume = this.#calcFieldByName(
        tradesForCurrency,
        'execAmount',
        { isAbs: true }
      )
      const volumeUsd = this.#calcFieldByName(
        tradesForCurrency,
        'amountUsd'
      )
      const marginFundingPayment = this.#calcFieldByName(
        marginFundingPaymentLedgers,
        'amount'
      )
      const calcedTradingFeeLedgers = this.#calcFieldByName(
        tradingFeeLedgers,
        'amount'
      )
      const calcedTradingFeeUsdLedgers = this.#calcFieldByName(
        tradingFeeLedgers,
        'amountUsd'
      )

      const balanceChange = calcedEndWalletBalance - calcedStartWalletBalance
      const balanceChangePerc = calcedStartWalletBalance === 0
        ? 0
        : (balanceChange / calcedStartWalletBalance) * 100
      const balanceChangeUsd = balanceChange * actualRate

      // In the Ledgers amount of fee is negative value, skip sign for UI
      const tradingFees = Math.abs(calcedTradingFeeLedgers)
      const tradingFeesUsd = Math.abs(calcedTradingFeeUsdLedgers)

      if (
        calcedEndWalletBalanceUsd < 0.01 &&
        volume <= 0 &&
        balanceChange <= 0 &&
        tradingFees <= 0 &&
        marginFundingPayment <= 0
      ) {
        continue
      }

      const res = {
        currency,
        balance: calcedEndWalletBalance,
        balanceUsd: calcedEndWalletBalanceUsd,
        balanceChange,
        balanceChangePerc,
        balanceChangeUsd,
        volume,
        volumeUsd,
        tradingFees,
        tradingFeesUsd,
        marginFundingPayment,

        // It's used to total perc calc
        calcedStartWalletBalanceUsd
      }

      currencyRes.push(res)
    }

    return currencyRes
  }

  #calcFieldByName (wallets, fieldName, opts) {
    const { isAbs } = opts ?? {}

    return wallets.reduce((accum, curr) => {
      if (!Number.isFinite(curr?.[fieldName])) {
        return accum
      }

      const val = isAbs
        ? Math.abs(curr[fieldName])
        : curr[fieldName]

      return accum + val
    }, 0)
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
        projection: this.ledgersModelFields
      }
    )
  }

  #calcTotal (summaryByAsset) {
    const initTotal = {
      balanceUsd: 0,
      balanceChangeUsd: 0,
      balanceChangePerc: 0,
      volumeUsd: 0,
      tradingFeesUsd: 0,

      calcedStartWalletBalanceUsd: 0
    }

    const res = summaryByAsset.reduce((accum, curr) => {
      this.#calcObjPropsByName(
        accum,
        curr,
        [
          'balanceUsd',
          'balanceChangeUsd',
          'volumeUsd',
          'tradingFeesUsd',

          'calcedStartWalletBalanceUsd'
        ]
      )

      if (accum.calcedStartWalletBalanceUsd !== 0) {
        accum.balanceChangePerc = (accum.balanceChangeUsd / accum.calcedStartWalletBalanceUsd) * 100
      }

      return accum
    }, initTotal)

    return omit(res, ['calcedStartWalletBalanceUsd'])
  }

  #calcObjPropsByName (accum, curr, propNames) {
    for (const propName of propNames) {
      accum[propName] = Number.isFinite(curr?.[propName])
        ? accum[propName] + curr[propName]
        : accum[propName]
    }
  }
}

decorateInjectable(SummaryByAsset, depsTypes)

module.exports = SummaryByAsset
