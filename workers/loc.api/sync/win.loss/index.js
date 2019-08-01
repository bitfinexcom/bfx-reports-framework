'use strict'

const moment = require('moment')
const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')
const {
  getInsertableArrayObjectsFilter
} = require('../dao/helpers')
const {
  calcGroupedData,
  groupByTimeframe,
  isForexSymb
} = require('../helpers')

class WinLoss {
  constructor (
    rService,
    dao,
    syncSchema,
    ALLOWED_COLLS,
    balanceHistory
  ) {
    this.rService = rService
    this.dao = dao
    this.syncSchema = syncSchema
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.balanceHistory = balanceHistory
  }

  _sumMovementsWithPrevRes (
    symbol,
    prevMovementsRes,
    movementsGroupedByTimeframe
  ) {
    return symbol.reduce((accum, symb) => {
      const prevMovement = Number.isFinite(prevMovementsRes[symb])
        ? prevMovementsRes[symb]
        : 0
      const movement = Number.isFinite(movementsGroupedByTimeframe[symb])
        ? movementsGroupedByTimeframe[symb]
        : 0
      const res = prevMovement + movement

      return {
        ...accum,
        [symb]: res
      }
    }, {})
  }

  _getWinLossByTimeframe (
    symbol = [],
    startWalletsVals = {}
  ) {
    let prevMovementsRes = {}

    return ({
      walletsGroupedByTimeframe,
      movementsGroupedByTimeframe
    } = {}) => {
      prevMovementsRes = this._sumMovementsWithPrevRes(
        symbol,
        prevMovementsRes,
        { ...movementsGroupedByTimeframe }
      )

      return symbol.reduce((accum, symb) => {
        const startWallet = Number.isFinite(startWalletsVals[symb])
          ? startWalletsVals[symb]
          : 0
        const wallet = Number.isFinite(walletsGroupedByTimeframe[symb])
          ? walletsGroupedByTimeframe[symb]
          : 0
        const movements = Number.isFinite(prevMovementsRes[symb])
          ? prevMovementsRes[symb]
          : 0
        const res = wallet - startWallet - movements

        return {
          ...accum,
          [symb]: res
        }
      }, {})
    }
  }

  _calcMovements (
    data = [],
    symbolFieldName,
    symbol = []
  ) {
    return data.reduce((accum, movement = {}) => {
      const { amount, amountUsd } = { ...movement }
      const currSymb = movement[symbolFieldName]
      const _isForexSymb = isForexSymb(currSymb, symbol)
      const _amount = _isForexSymb
        ? amount
        : amountUsd
      const symb = _isForexSymb
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

  _getStartWallets (symbol = []) {
    return symbol.reduce((accum, symb) => {
      return {
        ...accum,
        [symb]: 0
      }
    }, {})
  }

  _calcFirstWallets (
    data = [],
    symbol = [],
    startWallets = {}
  ) {
    return data.reduce((accum, movement = {}) => {
      const { balance, balanceUsd, currency } = { ...movement }
      const _isForexSymb = isForexSymb(currency, symbol)
      const _balance = _isForexSymb
        ? balance
        : balanceUsd
      const symb = _isForexSymb
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
      if ((groupedData.length - 1) === i) {
        return { ...item }
      }

      const mtsMoment = moment.utc(item.mts)

      if (timeframe === 'day') {
        mtsMoment.add(1, 'days')
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
    params: {
      timeframe = 'day',
      start = 0,
      end = Date.now()
    } = {}
  } = {}) {
    const user = await this.dao.checkAuthInDb({ auth })

    const symbol = ['EUR', 'JPY', 'GBP', 'USD']
    const args = {
      auth,
      params: {
        timeframe,
        start,
        end
      }
    }
    const movementsModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.MOVEMENTS)
    const movementsMethodColl = this.syncSchema.getMethodCollMap()
      .get('_getMovements')
    const {
      dateFieldName: movementsDateFieldName,
      symbolFieldName: movementsSymbolFieldName
    } = movementsMethodColl

    const movementsBaseFilter = getInsertableArrayObjectsFilter(
      movementsMethodColl,
      {
        start,
        end
      }
    )

    const movements = await this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.MOVEMENTS,
      {
        filter: {
          ...movementsBaseFilter,
          user_id: user._id
        },
        sort: [['mtsUpdated', -1]],
        projection: movementsModel,
        exclude: ['user_id'],
        isExcludePrivate: true
      }
    )
    const movementsGroupedByTimeframe = await groupByTimeframe(
      movements,
      timeframe,
      symbol,
      movementsDateFieldName,
      movementsSymbolFieldName,
      this._calcMovements.bind(this)
    )

    const firstWallets = await this.rService.getWallets(null, {
      auth,
      params: { end: start }
    })
    const startWallets = this._getStartWallets(symbol)
    const startWalletsInForex = this._calcFirstWallets(
      firstWallets,
      symbol,
      startWallets
    )
    const walletsGroupedByTimeframe = await this.balanceHistory
      .getBalanceHistory(
        args,
        true,
        symbol
      )

    const groupedData = await calcGroupedData(
      {
        walletsGroupedByTimeframe,
        movementsGroupedByTimeframe
      },
      false,
      this._getWinLossByTimeframe(symbol, startWalletsInForex),
      true
    )
    const res = this._shiftMtsToNextTimeframe(
      groupedData,
      timeframe
    )
    res.push({
      mts: start,
      ...startWallets
    })

    return res
  }
}

decorate(injectable(), WinLoss)
decorate(inject(TYPES.RService), WinLoss, 0)
decorate(inject(TYPES.DAO), WinLoss, 1)
decorate(inject(TYPES.SyncSchema), WinLoss, 2)
decorate(inject(TYPES.ALLOWED_COLLS), WinLoss, 3)
decorate(inject(TYPES.BalanceHistory), WinLoss, 4)

module.exports = WinLoss
