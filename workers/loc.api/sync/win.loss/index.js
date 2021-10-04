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
  TYPES.DAO,
  TYPES.SyncSchema,
  TYPES.BalanceHistory,
  TYPES.PositionsSnapshot,
  TYPES.FOREX_SYMBS,
  TYPES.Authenticator,
  TYPES.SYNC_API_METHODS,
  TYPES.Movements
]
class WinLoss {
  constructor (
    dao,
    syncSchema,
    balanceHistory,
    positionsSnapshot,
    FOREX_SYMBS,
    authenticator,
    SYNC_API_METHODS,
    movements
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
    this.balanceHistory = balanceHistory
    this.positionsSnapshot = positionsSnapshot
    this.FOREX_SYMBS = FOREX_SYMBS
    this.authenticator = authenticator
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.movements = movements

    this.movementsMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.MOVEMENTS)
    this.movementsSymbolFieldName = this.movementsMethodColl.symbolFieldName
  }

  _sumMovementsWithPrevRes (
    prevMovementsRes,
    withdrawalsGroupedByTimeframe,
    depositsGroupedByTimefram
  ) {
    return this.FOREX_SYMBS.reduce((accum, symb) => {
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

      return {
        ...accum,
        [symb]: res
      }
    }, {})
  }

  _getWinLossByTimeframe ({ isUnrealizedProfitExcluded }) {
    let firstWalletsVals = {}
    let firstPLVals = 0
    let prevMovementsRes = 0

    return ({
      walletsGroupedByTimeframe = {},
      withdrawalsGroupedByTimeframe = {},
      depositsGroupedByTimeframe = {},
      plGroupedByTimeframe = {}
    } = {}, i, arr) => {
      const isFirst = (i + 1) === arr.length

      if (isFirst) {
        firstWalletsVals = walletsGroupedByTimeframe
        firstPLVals = plGroupedByTimeframe
      }

      prevMovementsRes = this._sumMovementsWithPrevRes(
        prevMovementsRes,
        withdrawalsGroupedByTimeframe,
        depositsGroupedByTimeframe
      )

      const res = this.FOREX_SYMBS.reduce((accum, symb) => {
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

        if (!res) {
          return Object.assign(accum, { [symb]: 0 })
        }

        return Object.assign(accum, { [symb]: res })
      }, {})

      return res
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

  _shiftMtsToNextTimeframe (
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

  async getWinLoss ({
    auth = {},
    params = {}
  } = {}) {
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
        end
      }
    }

    const plGroupedByTimeframePromise = isUnrealizedProfitExcluded
      ? []
      : this.positionsSnapshot.getPLSnapshot(args)

    const walletsGroupedByTimeframePromise = this.balanceHistory.getBalanceHistory(
      {
        ...args,
        params: {
          ...args?.params,
          isUnrealizedProfitExcluded: true
        }
      },
      true
    )
    const withdrawalsPromise = this.movements.getMovements({
      auth: user,
      start,
      end,
      filter: {
        $not: { status: 'CANCELED' },
        $lt: { amount: 0 },
        $gte: { mtsStarted: start },
        $lte: { mtsStarted: end }
      },
      sort: [['mtsStarted', -1]]
    })
    const depositsPromise = this.movements.getMovements({
      auth: user,
      start,
      end,
      filter: {
        $eq: { status: 'COMPLETED' },
        $gt: { amount: 0 }
      }
    })

    const [
      withdrawals,
      deposits
    ] = await Promise.all([
      withdrawalsPromise,
      depositsPromise
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

    const [
      withdrawalsGroupedByTimeframe,
      depositsGroupedByTimeframe,
      walletsGroupedByTimeframe,
      plGroupedByTimeframe
    ] = await Promise.all([
      withdrawalsGroupedByTimeframePromise,
      depositsGroupedByTimeframePromise,
      walletsGroupedByTimeframePromise,
      plGroupedByTimeframePromise
    ])

    const groupedData = await calcGroupedData(
      {
        walletsGroupedByTimeframe,
        withdrawalsGroupedByTimeframe,
        depositsGroupedByTimeframe,
        plGroupedByTimeframe
      },
      false,
      this._getWinLossByTimeframe(
        { isUnrealizedProfitExcluded }
      ),
      true
    )
    groupedData.push({
      mts: start,
      USD: 0
    })
    const res = this._shiftMtsToNextTimeframe(
      groupedData,
      { timeframe, end }
    )

    return res
  }
}

decorateInjectable(WinLoss, depsTypes)

module.exports = WinLoss
