'use strict'

const moment = require('moment')

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
      const res = wallet - startWallet - movements

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

const _calcFirstWallets = (
  data = [],
  symbol = []
) => {
  const startData = symbol.reduce((accum, symb) => {
    return {
      ...accum,
      [symb]: 0
    }
  }, {})

  return data.reduce((accum, movement = {}) => {
    const { balance, balanceUsd, currency } = { ...movement }
    const _isForexSymb = isForexSymb(symbol, currency)
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
  }, startData)
}

const _shiftMtsToNextTimeframe = (
  groupedData,
  timeframe
) => {
  return groupedData.map(item => {
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

  const firstWallets = await rService.getWallets(null, {
    auth,
    params: { end: start }
  })
  const startWalletsInForex = _calcFirstWallets(
    firstWallets,
    symbol
  )
  const walletsGroupedByTimeframe = await getBalanceHistory(
    { dao },
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
    _getWinLossByTimeframe(symbol, startWalletsInForex),
    true
  )
  const res = _shiftMtsToNextTimeframe(
    groupedData,
    timeframe
  )
  res.push({
    mts: start,
    ...startWalletsInForex
  })

  return res
}
