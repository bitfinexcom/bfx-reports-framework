'use strict'

const {
  getInsertableArrayObjectsFilter
} = require('bfx-report/workers/loc.api/sync/dao/helpers')

const ALLOWED_COLLS = require('../allowed.colls')
const {
  getModelsMap,
  getMethodCollMap
} = require('../schema')
const { groupByTimeframe } = require('./helpers')

// TODO: need to add crypto currency conversation
const _calcTradesData = (
  data = [],
  symbolFieldName,
  symbol = []
) => {
  return symbol.reduce((accum, currSymb) => {
    const _sum = data.reduce((sum, trade) => {
      const { execAmount } = trade
      const symb = trade[symbolFieldName]
      const regExp = new RegExp(`${currSymb}$`)

      return (
        regExp.test(symb) &&
        Number.isFinite(execAmount)
      )
        ? sum + execAmount
        : sum
    }, 0)
    const res = _sum ? { [currSymb]: _sum } : {}

    return {
      ...accum,
      ...res
    }
  }, {})
}

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
  const tradesModel = getModelsMap().get(ALLOWED_COLLS.TRADES)
  const tradesMethodColl = getMethodCollMap().get('_getTrades')
  const {
    dateFieldName,
    symbolFieldName
  } = tradesMethodColl

  const baseFilter = getInsertableArrayObjectsFilter(
    tradesMethodColl,
    {
      start,
      end
    }
  )

  const trades = await dao.getElemsInCollBy(
    ALLOWED_COLLS.TRADES,
    {
      filter: {
        ...baseFilter,
        user_id
      },
      sort: [['mtsCreate', -1]],
      projection: tradesModel,
      exclude: ['user_id'],
      isExcludePrivate: true
    }
  )
  const tradesRes = groupByTimeframe(
    trades,
    timeframe,
    symbol,
    dateFieldName,
    symbolFieldName,
    _calcTradesData
  )

  // TODO:
  return tradesRes
}
