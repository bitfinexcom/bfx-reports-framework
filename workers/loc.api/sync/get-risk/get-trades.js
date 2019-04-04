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
  groupByTimeframe,
  calcGroupedData
} = require('./helpers')

const _getLastCandleInTimeframe = (
  data = [],
  symbolFieldName
) => {
  return data.reduce((accum, curr) => {
    const res = {}

    if (
      curr &&
      typeof curr === 'object' &&
      Number.isFinite(curr.close) &&
      typeof curr[symbolFieldName] === 'string' &&
      curr[symbolFieldName].length === 7
    ) {
      const symb = curr[symbolFieldName].slice(1, 4)
      const isUsd = curr[symbolFieldName].slice(4, 7)

      if (
        isUsd &&
        Object.keys(accum).every(s => s !== symb)
      ) {
        res[symb] = curr.close
      }
    }

    return {
      ...accum,
      ...res
    }
  }, {})
}

// TODO:
const _calcTradesInTimeframe = (
  data = [],
  symbolFieldName,
  symbol = []
) => {
  return data.reduce((accum, curr) => {
    const res = {}

    return {
      ...accum,
      ...res
    }
  }, {})
}

// TODO:
module.exports = async (dao, args) => {
  const {
    // eslint-disable-next-line camelcase
    auth: { _id: user_id },
    params: {
      symbol,
      timeframe,
      start,
      end
    } = {}
  } = { ...args }
  const tradesModel = getModelsMap()
    .get(ALLOWED_COLLS.TRADES)
  const candlesModel = getModelsMap()
    .get(ALLOWED_COLLS.CANDLES)
  const tradesMethodColl = getMethodCollMap()
    .get('_getTrades')
  const candlesMethodColl = getMethodCollMap()
    .get('_getCandles')
  const {
    dateFieldName: tradesDateFieldName,
    symbolFieldName: tradesSymbolFieldName
  } = tradesMethodColl
  const {
    dateFieldName: candlesDateFieldName,
    symbolFieldName: candlesSymbolFieldName
  } = candlesMethodColl

  const tradesBaseFilter = getInsertableArrayObjectsFilter(
    tradesMethodColl,
    {
      start,
      end
    }
  )
  const candlesBaseFilter = getInsertableArrayObjectsFilter(
    candlesMethodColl,
    {
      start,
      end
    }
  )

  const candles = await dao.getElemsInCollBy(
    ALLOWED_COLLS.CANDLES,
    {
      filter: {
        ...candlesBaseFilter
      },
      sort: [['mts', -1]],
      projection: candlesModel
    }
  )
  const trades = await dao.getElemsInCollBy(
    ALLOWED_COLLS.TRADES,
    {
      filter: {
        ...tradesBaseFilter,
        user_id
      },
      sort: [['mtsCreate', -1]],
      projection: tradesModel,
      exclude: ['user_id'],
      isExcludePrivate: true
    }
  )

  const candlesGroupedByTimeframe = await groupByTimeframe(
    candles,
    timeframe,
    symbol,
    candlesDateFieldName,
    candlesSymbolFieldName,
    _getLastCandleInTimeframe,
    dao
  )
  const tradesGroupedByTimeframe = await groupByTimeframe(
    trades,
    timeframe,
    symbol,
    tradesDateFieldName,
    tradesSymbolFieldName,
    _calcTradesInTimeframe,
    dao
  )

  return null
}
