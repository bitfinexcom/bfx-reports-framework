'use strict'

const moment = require('moment')

const {
  calcGroupedData,
  groupByTimeframe,
  isForexSymb,
  getStartMtsByTimeframe
} = require('../helpers')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.SyncSchema,
  TYPES.BalanceHistory,
  TYPES.PositionsSnapshot,
  TYPES.FOREX_SYMBS,
  TYPES.Authenticator,
  TYPES.SYNC_API_METHODS,
  TYPES.Movements,
  TYPES.Wallets
]
class WinLoss {
  constructor (
    syncSchema,
    balanceHistory,
    positionsSnapshot,
    FOREX_SYMBS,
    authenticator,
    SYNC_API_METHODS,
    movements,
    wallets
  ) {
    this.syncSchema = syncSchema
    this.balanceHistory = balanceHistory
    this.positionsSnapshot = positionsSnapshot
    this.FOREX_SYMBS = FOREX_SYMBS
    this.authenticator = authenticator
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.movements = movements
    this.wallets = wallets

    this.movementsMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.MOVEMENTS)
    this.ledgersMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.LEDGERS)
    this.movementsSymbolFieldName = this.movementsMethodColl
      .getModelField('SYMBOL_FIELD_NAME')
    this.ledgersSymbolFieldName = this.ledgersMethodColl
      .getModelField('SYMBOL_FIELD_NAME')
  }

  sumMovementsWithPrevRes (
    prevMovementsRes,
    withdrawalsGroupedByTimeframe,
    depositsGroupedByTimefram
  ) {
    const symb = 'USD'

    const prevMovement = Number.isFinite(prevMovementsRes?.[symb])
      ? prevMovementsRes[symb]
      : 0
    const withdrawals = Number.isFinite(withdrawalsGroupedByTimeframe?.[symb])
      ? withdrawalsGroupedByTimeframe[symb]
      : 0
    const deposits = Number.isFinite(depositsGroupedByTimefram?.[symb])
      ? depositsGroupedByTimefram[symb]
      : 0
    const res = prevMovement + withdrawals + deposits

    return { [symb]: res }
  }

  _getWinLossByTimeframe ({
    isUnrealizedProfitExcluded,
    firstWalletsVals
  }) {
    let firstPLVals = 0
    let prevMovementsRes = 0

    return ({
      walletsGroupedByTimeframe = {},
      withdrawalsGroupedByTimeframe = {},
      depositsGroupedByTimeframe = {},
      plGroupedByTimeframe = {}
    } = {}, i, arr) => {
      const symb = 'USD'
      const isFirst = (i + 1) === arr.length

      if (isFirst) {
        firstPLVals = plGroupedByTimeframe
      }

      prevMovementsRes = this.sumMovementsWithPrevRes(
        prevMovementsRes,
        withdrawalsGroupedByTimeframe,
        depositsGroupedByTimeframe
      )

      const movements = Number.isFinite(prevMovementsRes[symb])
        ? prevMovementsRes[symb]
        : 0
      const firstWallets = Number.isFinite(firstWalletsVals[symb])
        ? firstWalletsVals[symb]
        : 0
      const wallets = Number.isFinite(walletsGroupedByTimeframe[symb])
        ? walletsGroupedByTimeframe[symb]
        : 0
      const firstPL = Number.isFinite(firstPLVals[symb])
        ? firstPLVals[symb]
        : 0
      const pl = Number.isFinite(plGroupedByTimeframe[symb])
        ? plGroupedByTimeframe[symb]
        : 0

      const realized = (wallets - movements) - firstWallets
      const unrealized = isUnrealizedProfitExcluded
        ? 0
        : pl - firstPL

      const res = realized + unrealized

      if (!Number.isFinite(res)) {
        return { [symb]: 0 }
      }

      return { [symb]: res }
    }
  }

  _calcMovements (
    data = [],
    args = {}
  ) {
    const {
      symbolFieldName,
      symbol = []
    } = args

    return data.reduce((accum, movement = {}) => {
      const { amount, amountUsd } = { ...movement }
      const currSymb = movement[symbolFieldName]
      const _isForexSymb = isForexSymb(currSymb, symbol)
      const _isNotUsedAmountUsdField = (
        _isForexSymb &&
        !Number.isFinite(amountUsd)
      )
      const _amount = _isNotUsedAmountUsdField
        ? amount
        : amountUsd
      const symb = _isNotUsedAmountUsdField
        ? currSymb
        : 'USD'

      if (!Number.isFinite(_amount)) {
        return { ...accum }
      }

      return {
        ...accum,
        [symb]: (Number.isFinite(accum[symb]))
          ? accum[symb] + _amount
          : _amount
      }
    }, {})
  }

  shiftMtsToNextTimeframe (
    groupedData,
    {
      timeframe,
      end
    }
  ) {
    return groupedData.reduce((accum, item, i) => {
      // If end mts is not exactly start of day (2020-04-22T15:15:15.000Z)
      // no need to skip item as it's the next timeframe
      const isFirst = i === 0
      // Here would be { mts: start, USD: 0 }
      const isLast = i === (groupedData.length - 1)

      if (
        isFirst &&
        getStartMtsByTimeframe(end, timeframe) === end
      ) {
        return accum
      }
      if (isLast) {
        accum.push(item)

        return accum
      }

      const _mts = isFirst ? end : item.mts
      const mtsMoment = moment.utc(_mts)

      if (timeframe === 'day') {
        mtsMoment.add(1, 'days')
      }
      if (timeframe === 'week') {
        mtsMoment.add(1, 'weeks')
        mtsMoment.isoWeekday(1)
      }
      if (timeframe === 'month') {
        mtsMoment.add(1, 'months')
      }
      if (timeframe === 'year') {
        mtsMoment.add(1, 'years')
      }

      const mts = mtsMoment.valueOf()

      item.mts = mts
      accum.push(item)

      return accum
    }, [])
  }

  async getDataToCalcWinLoss (args = {}, opts = {}) {
    const {
      auth = {},
      params = {}
    } = args ?? {}
    const {
      isSubAccountsTransferLedgersAdded,
      isMovementsWithoutSATransferLedgers
    } = opts ?? {}

    const {
      timeframe = 'day',
      start = 0,
      end = Date.now(),
      isUnrealizedProfitExcluded
    } = params ?? {}

    const plGroupedByTimeframePromise = isUnrealizedProfitExcluded
      ? []
      : this.positionsSnapshot.getPLSnapshot(args)

    const firstWalletsPromise = this.wallets.getWallets({
      auth,
      params: { end: start }
    })
    const walletsGroupedByTimeframePromise = this.balanceHistory.getBalanceHistory(
      {
        ...args,
        params: {
          ...args?.params,
          isUnrealizedProfitExcluded: true
        }
      },
      { isSubCalc: true }
    )
    const withdrawalsPromise = this.movements.getMovements({
      auth,
      start,
      end,
      sort: [['mtsStarted', -1]],
      isWithdrawals: true,
      isMovementsWithoutSATransferLedgers
    })
    const depositsPromise = this.movements.getMovements({
      auth,
      start,
      end,
      sort: [['mtsUpdated', -1]],
      isDeposits: true,
      isMovementsWithoutSATransferLedgers
    })
    const subAccountsTransferLedgersPromise = isSubAccountsTransferLedgersAdded
      ? this.movements.getSubAccountsTransferLedgers({
        auth,
        start,
        end,
        sort: [['mts', -1], ['id', -1]]
      })
      : null

    const [
      withdrawals,
      deposits,
      subAccountsTransferLedgers
    ] = await Promise.all([
      withdrawalsPromise,
      depositsPromise,
      subAccountsTransferLedgersPromise
    ])

    const withdrawalsGroupedByTimeframePromise = groupByTimeframe(
      withdrawals,
      { timeframe, start, end },
      this.FOREX_SYMBS,
      'mtsStarted',
      this.movementsSymbolFieldName,
      this._calcMovements.bind(this)
    )
    const depositsGroupedByTimeframePromise = groupByTimeframe(
      deposits,
      { timeframe, start, end },
      this.FOREX_SYMBS,
      'mtsUpdated',
      this.movementsSymbolFieldName,
      this._calcMovements.bind(this)
    )
    const subAccountsTransferLedgersGroupedByTimeframePromise = isSubAccountsTransferLedgersAdded
      ? groupByTimeframe(
        subAccountsTransferLedgers,
        { timeframe, start, end },
        this.FOREX_SYMBS,
        'mts',
        this.ledgersSymbolFieldName,
        // NOTE: The movements fn may be used to calc ledgers
        this._calcMovements.bind(this)
      )
      : null

    const [
      firstWallets,
      withdrawalsGroupedByTimeframe,
      depositsGroupedByTimeframe,
      walletsGroupedByTimeframe,
      plGroupedByTimeframe,
      subAccountsTransferLedgersGroupedByTimeframe
    ] = await Promise.all([
      firstWalletsPromise,
      withdrawalsGroupedByTimeframePromise,
      depositsGroupedByTimeframePromise,
      walletsGroupedByTimeframePromise,
      plGroupedByTimeframePromise,
      subAccountsTransferLedgersGroupedByTimeframePromise
    ])

    const firstWalletsVals = firstWallets.reduce((accum, curr = {}) => {
      const { balance, balanceUsd, currency } = curr ?? {}
      const _isForexSymb = isForexSymb(currency, this.FOREX_SYMBS)
      const _isNotUsedBalanceUsdField = (
        _isForexSymb &&
        !Number.isFinite(balanceUsd)
      )
      const _balance = _isNotUsedBalanceUsdField
        ? balance
        : balanceUsd
      const symb = _isNotUsedBalanceUsdField
        ? currency
        : 'USD'

      if (!Number.isFinite(_balance)) {
        return accum
      }

      accum[symb] = Number.isFinite(accum[symb])
        ? accum[symb] + _balance
        : _balance

      return accum
    }, {})

    return {
      firstWalletsVals,
      withdrawalsGroupedByTimeframe,
      depositsGroupedByTimeframe,
      walletsGroupedByTimeframe,
      plGroupedByTimeframe,
      subAccountsTransferLedgersGroupedByTimeframe
    }
  }

  async getWinLoss (_args = {}) {
    const {
      auth = {},
      params = {}
    } = _args ?? {}
    const user = await this.authenticator
      .verifyRequestUser({ auth })

    const {
      timeframe = 'day',
      start = 0,
      end = Date.now(),
      isUnrealizedProfitExcluded
    } = params ?? {}
    const args = {
      auth: user,
      params: {
        timeframe,
        start,
        end,
        isUnrealizedProfitExcluded
      }
    }

    const {
      firstWalletsVals,
      walletsGroupedByTimeframe,
      withdrawalsGroupedByTimeframe,
      depositsGroupedByTimeframe,
      plGroupedByTimeframe
    } = await this.getDataToCalcWinLoss(args)

    const groupedData = await calcGroupedData(
      {
        walletsGroupedByTimeframe,
        withdrawalsGroupedByTimeframe,
        depositsGroupedByTimeframe,
        plGroupedByTimeframe
      },
      false,
      this._getWinLossByTimeframe(
        {
          isUnrealizedProfitExcluded,
          firstWalletsVals
        }
      ),
      true
    )
    groupedData.push({
      mts: start,
      USD: 0
    })
    const res = this.shiftMtsToNextTimeframe(
      groupedData,
      { timeframe, end }
    )

    return res
  }
}

decorateInjectable(WinLoss, depsTypes)

module.exports = WinLoss
