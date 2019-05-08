'use strict'

const {
  getInsertableArrayObjectsFilter
} = require('bfx-report/workers/loc.api/sync/dao/helpers')

const ALLOWED_COLLS = require('../allowed.colls')
const {
  getModelsMap,
  getMethodCollMap
} = require('../schema')
const {
  calcGroupedData,
  groupByTimeframe,
  isForexSymb
} = require('../helpers')
const getBalanceHistory = require('../get-balance-history')

const _sumMovementsWithPrevRes = (
  symbol,
  prevMovementsRes,
  movementsGroupedByTimeframe
) => {
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

const _getWinLossByTimeframe = (
  symbol = [],
  startWalletsVals = {}
) => {
  let prevMovementsRes = {}

  return ({
    walletsGroupedByTimeframe,
    movementsGroupedByTimeframe
  } = {}) => {
    prevMovementsRes = _sumMovementsWithPrevRes(
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
      const res = (wallet - startWallet) + movements

      return {
        ...accum,
        [symb]: res
      }
    }, {})
  }
}

const _calcMovements = (
  data = [],
  symbolFieldName,
  symbol = []
) => {
  return data.reduce((accum, movement = {}) => {
    const { amount, amountUsd } = { ...movement }
    const currSymb = movement[symbolFieldName]
    const _isForexSymb = isForexSymb(symbol, currSymb)
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

module.exports = async (
  rService,
  {
    auth = {},
    params: {
      timeframe = 'day',
      start = 0,
      end = Date.now()
    } = {}
  } = {}
) => {
  const { dao } = rService
  const user = await rService.dao.checkAuthInDb({ auth })

  const symbol = ['EUR', 'JPY', 'GBP', 'USD']
  const args = {
    auth,
    params: {
      timeframe,
      start,
      end
    }
  }
  const movementsModel = getModelsMap().get(ALLOWED_COLLS.MOVEMENTS)
  const movementsMethodColl = getMethodCollMap().get('_getMovements')
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

  const movements = await dao.getElemsInCollBy(
    ALLOWED_COLLS.MOVEMENTS,
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
    _calcMovements
  )

  const walletsGroupedByTimeframe = await getBalanceHistory(
    { dao },
    args,
    true,
    symbol
  )

  const startWalletsInForex = {
    ...({
      ...walletsGroupedByTimeframe[walletsGroupedByTimeframe.length - 1]
    }).vals
  }

  const res = await calcGroupedData(
    {
      walletsGroupedByTimeframe,
      movementsGroupedByTimeframe
    },
    false,
    _getWinLossByTimeframe(symbol, startWalletsInForex),
    true
  )

  return res
}
