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
  TYPES.Wallets,
  TYPES.BalanceHistory,
  TYPES.PositionsSnapshot,
  TYPES.FOREX_SYMBS,
  TYPES.Authenticator,
  TYPES.SYNC_API_METHODS,
  TYPES.Movements,
  TYPES.ALLOWED_COLLS
]
class WinLoss {
  constructor (
    syncSchema,
    wallets,
    balanceHistory,
    positionsSnapshot,
    FOREX_SYMBS,
    authenticator,
    SYNC_API_METHODS,
    movements,
    ALLOWED_COLLS
  ) {
    this.syncSchema = syncSchema
    this.wallets = wallets
    this.balanceHistory = balanceHistory
    this.positionsSnapshot = positionsSnapshot
    this.FOREX_SYMBS = FOREX_SYMBS
    this.authenticator = authenticator
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.movements = movements
    this.ALLOWED_COLLS = ALLOWED_COLLS

    this.positionsHistoryModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.POSITIONS_HISTORY)
    this.movementsMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.MOVEMENTS)
    this.movementsSymbolFieldName = this.movementsMethodColl.symbolFieldName
    this.positionsSnapshotMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.POSITIONS_SNAPSHOT)
    this.positionsSnapshotSymbolFieldName = this.positionsSnapshotMethodColl.symbolFieldName
  }

  async _calcPlFromPositionsSnapshots (data = []) {
    return data.reduce((accum, curr) => {
      const { plUsd } = { ...curr }
      const symb = 'USD'

      if (!Number.isFinite(plUsd)) {
        return accum
      }

      return {
        ...accum,
        [symb]: Number.isFinite(accum[symb])
          ? accum[symb] + plUsd
          : plUsd
      }
    }, {})
  }

  _sumMovementsWithPrevRes (
    prevMovementsRes,
    withdrawalsGroupedByTimeframe,
    depositsGroupedByTimefram
  ) {
    return this.FOREX_SYMBS.reduce((accum, symb) => {
      const prevMovement = Number.isFinite(prevMovementsRes[symb])
        ? prevMovementsRes[symb]
        : 0
      const withdrawals = Number.isFinite(withdrawalsGroupedByTimeframe[symb])
        ? withdrawalsGroupedByTimeframe[symb]
        : 0
      const deposits = Number.isFinite(depositsGroupedByTimefram[symb])
        ? depositsGroupedByTimefram[symb]
        : 0
      const res = prevMovement + withdrawals + deposits

      return {
        ...accum,
        [symb]: res
      }
    }, {})
  }

  _getWinLossByTimeframe (
    startWalletsVals = {}
  ) {
    let prevMovementsRes = {}

    return ({
      walletsGroupedByTimeframe = {},
      withdrawalsGroupedByTimeframe = {},
      depositsGroupedByTimeframe = {},
      plGroupedByTimeframe = {}
    } = {}) => {
      prevMovementsRes = this._sumMovementsWithPrevRes(
        prevMovementsRes,
        { ...withdrawalsGroupedByTimeframe },
        { ...depositsGroupedByTimeframe }
      )

      return this.FOREX_SYMBS.reduce((accum, symb) => {
        const startWallet = Number.isFinite(startWalletsVals[symb])
          ? startWalletsVals[symb]
          : 0
        const wallet = Number.isFinite(walletsGroupedByTimeframe[symb])
          ? walletsGroupedByTimeframe[symb]
          : 0
        const movements = Number.isFinite(prevMovementsRes[symb])
          ? prevMovementsRes[symb]
          : 0
        const pl = Number.isFinite(plGroupedByTimeframe[symb])
          ? plGroupedByTimeframe[symb]
          : 0
        const res = (wallet - startWallet - movements) + pl

        if (!res) {
          return { ...accum }
        }

        return {
          ...accum,
          [symb]: res
        }
      }, {})
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

  _getStartWallets () {
    return this.FOREX_SYMBS.reduce((accum, symb) => {
      return {
        ...accum,
        [symb]: 0
      }
    }, {})
  }

  _calcFirstWallets (
    data = [],
    startWallets = {}
  ) {
    return data.reduce((accum, movement = {}) => {
      const { balance, balanceUsd, currency } = { ...movement }
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
        return { ...accum }
      }

      return {
        ...accum,
        [symb]: (Number.isFinite(accum[symb]))
          ? accum[symb] + _balance
          : _balance
      }
    }, startWallets)
  }

  _shiftMtsToNextTimeframe (
    groupedData,
    timeframe
  ) {
    return groupedData.map((item, i) => {
      if (
        i === (groupedData.length - 1) ||
        i === 0
      ) {
        return { ...item }
      }

      const normalizedMtsByTimeframe = getStartMtsByTimeframe(
        item.mts,
        timeframe
      )
      const mtsMoment = moment.utc(normalizedMtsByTimeframe)

      if (timeframe === 'day') {
        mtsMoment.add(1, 'days')
      }
      if (timeframe === 'week') {
        mtsMoment.add(1, 'weeks')
      }
      if (timeframe === 'month') {
        mtsMoment.add(1, 'months')
      }
      if (timeframe === 'year') {
        mtsMoment.add(1, 'years')
      }

      const mts = mtsMoment.valueOf()

      return { ...item, mts }
    })
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
      end = Date.now()
    } = { ...params }
    const args = {
      auth,
      params: {
        timeframe,
        start,
        end
      }
    }

    const walletsGroupedByTimeframePromise = this.balanceHistory
      .getBalanceHistory(
        args,
        true
      )
    const firstWalletsPromise = this.wallets.getWallets({
      auth,
      params: { end: start }
    })

    const dailyPositionsSnapshotsPromise = this.positionsSnapshot
      .getSyncedPositionsSnapshot(args)
    const positionsHistoryPromise = this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.POSITIONS_HISTORY,
      {
        filter: {
          user_id: user._id,
          $gte: { mtsUpdate: start },
          $lte: { mtsUpdate: end }
        },
        sort: [['mtsUpdate', -1]],
        projection: this.positionsHistoryModel,
        exclude: ['user_id'],
        isExcludePrivate: true
      }
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
      deposits,
      firstWallets,
      dailyPositionsSnapshots,
      positionsHistory
    ] = await Promise.all([
      withdrawalsPromise,
      depositsPromise,
      firstWalletsPromise,
      dailyPositionsSnapshotsPromise,
      positionsHistoryPromise
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
    const plGroupedByTimeframePromise = groupByTimeframe(
      dailyPositionsSnapshots,
      { timeframe, start, end },
      this.FOREX_SYMBS,
      'mtsUpdate',
      this.positionsSnapshotSymbolFieldName,
      this._calcPlFromPositionsSnapshots.bind(this)
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

    const startWallets = this._getStartWallets()
    const startWalletsInForex = this._calcFirstWallets(
      firstWallets,
      startWallets
    )

    const groupedData = await calcGroupedData(
      {
        walletsGroupedByTimeframe,
        withdrawalsGroupedByTimeframe,
        depositsGroupedByTimeframe,
        plGroupedByTimeframe
      },
      false,
      this._getWinLossByTimeframe(startWalletsInForex),
      true
    )
    groupedData.push({
      mts: start,
      USD: 0
    })
    const res = this._shiftMtsToNextTimeframe(
      groupedData,
      timeframe
    )

    return res
  }
}

decorateInjectable(WinLoss, depsTypes)

module.exports = WinLoss
