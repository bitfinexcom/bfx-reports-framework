'use strict'

const { omit } = require('lib-js-util-base')
const moment = require('moment')
const math = require('mathjs')

const { getBackIterable } = require('../helpers')
const { pushLargeArr } = require('../../helpers/utils')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.SyncSchema,
  TYPES.Authenticator,
  TYPES.SYNC_API_METHODS,
  TYPES.ALLOWED_COLLS,
  TYPES.Wallets,
  TYPES.Trades,
  TYPES.Movements,
  TYPES.WinLossVSAccountBalance
]
class SummaryByAsset {
  #ledgerFeeCats = [201, 204, 207, 222, 224, 228, 241,
    243, 251, 254, 255, 258, 905]

  constructor (
    dao,
    syncSchema,
    authenticator,
    SYNC_API_METHODS,
    ALLOWED_COLLS,
    wallets,
    trades,
    movements,
    winLossVSAccountBalance
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
    this.authenticator = authenticator
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.wallets = wallets
    this.trades = trades
    this.movements = movements
    this.winLossVSAccountBalance = winLossVSAccountBalance

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
    const withdrawalsPromise = this.movements.getMovements({
      auth,
      start,
      end,
      isWithdrawals: true,
      isExcludePrivate: false
    })
    const depositsPromise = this.movements.getMovements({
      auth,
      start,
      end,
      isDeposits: true,
      isExcludePrivate: false
    })
    const dailyBalancesAndPLPromise = this.winLossVSAccountBalance
      .getWinLossVSAccountBalance({
        auth,
        params: {
          start,
          end,
          timeframe: 'day',
          isUnrealizedProfitExcluded: args?.params
            ?.isUnrealizedProfitExcluded,
          shouldTimeframePLBeReturned: true
        }
      })

    const [
      trades,
      ledgers,
      startWallets,
      endWallets,
      withdrawals,
      deposits,
      dailyBalancesAndPL
    ] = await Promise.all([
      tradesPromise,
      ledgersPromise,
      startWalletsPromise,
      endWalletsPromise,
      withdrawalsPromise,
      depositsPromise,
      dailyBalancesAndPLPromise
    ])

    const _summaryByAsset = this.#calcSummaryByAsset({
      trades,
      ledgers,
      startWallets,
      endWallets
    })
    const total = this.#calcTotal(
      _summaryByAsset,
      withdrawals,
      deposits,
      dailyBalancesAndPL
    )
    const summaryByAsset = _summaryByAsset.map((item) => (
      omit(item, [
        'balanceChangeUsd',
        'tradingFeesUsd',
        'calcedStartWalletBalanceUsd',
        'allFeesUsd'
      ])
    ))

    return {
      summaryByAsset,
      total
    }
  }

  #calcSummaryByAsset ({
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

      const ledgerMap = this.#makeLedgerMapFilteredByCcyGroupedByCategory(
        ledgers,
        currency,
        [28, ...this.#ledgerFeeCats]
      )
      const tradesForCurrency = trades.filter((trade) => (
        trade?.baseCurrency === currency
      ))
      const marginFundingPaymentLedgers = ledgerMap.get(28) ?? []
      const tradingFeeLedgers = ledgerMap.get(201) ?? []
      const allFeeLedgers = this.#ledgerFeeCats.reduce((accum, cat) => {
        pushLargeArr(accum, ledgerMap.get(cat) ?? [])

        return accum
      }, [])

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
      const calcedAllFeeUsdLedgers = this.#calcFieldByName(
        allFeeLedgers,
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
      const allFeesUsd = Math.abs(calcedAllFeeUsdLedgers)

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
        allFeesUsd,
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

  #calcTotal (
    summaryByAsset,
    withdrawals,
    deposits,
    dailyBalancesAndPL
  ) {
    const calcedWithdrawalsUsd = this.#calcFieldByName(
      withdrawals,
      'amountUsd'
    )
    const calcedDepositsUsd = this.#calcFieldByName(
      deposits,
      'amountUsd'
    )
    const plUsd = this.#calcPLUsd(dailyBalancesAndPL)
    const returns = this.#getDailyReturns(dailyBalancesAndPL)
    const {
      volatilityPerc,
      sharpeRatio,
      sortinoRatio
    } = this.#calcDailyReturnStatistics(returns)
    const maxDrawdownPerc = this.#calcMaxDrawdownPerc(dailyBalancesAndPL)

    const initTotal = {
      balanceUsd: 0,
      balanceChangeUsd: 0,
      balanceChangePerc: 0,
      volumeUsd: 0,
      tradingFeesUsd: 0,
      allFeesUsd: 0,

      calcedStartWalletBalanceUsd: 0,

      depositsWithdrawalsUsd: (
        calcedWithdrawalsUsd +
        calcedDepositsUsd
      ),
      plUsd,
      volatilityPerc,
      sharpeRatio,
      sortinoRatio,
      maxDrawdownPerc
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
          'allFeesUsd',

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

  #makeLedgerMapFilteredByCcyGroupedByCategory (
    ledgers, ccy, categories
  ) {
    const ledgerMap = new Map()

    if (
      !Array.isArray(categories) ||
      categories.length === 0
    ) {
      return ledgerMap
    }

    for (const category of categories) {
      ledgerMap.set(category, [])
    }

    for (const ledger of ledgers) {
      if (ledger?.[this.ledgersSymbolFieldName] !== ccy) {
        continue
      }

      for (const [category, arr] of ledgerMap) {
        if (ledger?._category !== category) {
          continue
        }

        arr.push(ledger)
      }
    }

    return ledgerMap
  }

  #calcPLUsd (dailyBalancesAndPL) {
    if (
      !Array.isArray(dailyBalancesAndPL) ||
      dailyBalancesAndPL.length === 0
    ) {
      return 0
    }

    const lastBalance = dailyBalancesAndPL?.[0]
      ?.balanceWithoutMovementsUsd ?? 0
    const firstBalance = dailyBalancesAndPL?.[dailyBalancesAndPL.length - 1]
      ?.balanceWithoutMovementsUsd ?? 0

    return lastBalance - firstBalance
  }

  #getDailyReturns (dailyBalancesAndPL) {
    if (!Array.isArray(dailyBalancesAndPL)) {
      return []
    }

    return dailyBalancesAndPL.map((item) => item?.returns)
  }

  #calcDailyReturnStatistics (dailyReturns) {
    const returnStd = math.std(dailyReturns)
    const avgReturn = math.mean(dailyReturns)
    const sqrt365 = Math.sqrt(365)

    const volatilityPerc = returnStd * sqrt365 * 100
    const sharpeRatio = (avgReturn / returnStd) * sqrt365

    const negativeReturns = dailyReturns.filter((r) => r < 0)
    const downsideStd = negativeReturns.length > 0
      ? math.std(negativeReturns)
      : 0.00001
    const sortinoRatio = (avgReturn / downsideStd) * sqrt365

    return {
      volatilityPerc,
      sharpeRatio,
      sortinoRatio
    }
  }

  #calcMaxDrawdownPerc (dailyBalancesAndPL) {
    if (
      !Array.isArray(dailyBalancesAndPL) ||
      dailyBalancesAndPL.length === 0
    ) {
      return 0
    }

    const iterator = getBackIterable(dailyBalancesAndPL)
    let peak = dailyBalancesAndPL?.[dailyBalancesAndPL.length - 1]
      ?.balanceWithoutMovementsUsd ?? 0
    let maxDrawdown = 0

    for (const item of iterator) {
      const balance = item?.balanceWithoutMovementsUsd ?? 0

      if (balance > peak) {
        peak = balance
      }

      const drawdown = peak !== 0
        ? (peak - balance) / peak
        : 0

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    }

    return maxDrawdown * 100
  }
}

decorateInjectable(SummaryByAsset, depsTypes)

module.exports = SummaryByAsset
