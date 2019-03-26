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

const _calcData = (
  data = [],
  symbolFieldName,
  symbol = []
) => {
  return symbol.reduce((accum, currSymb) => {
    const _sum = data.reduce((sum, movement) => {
      const { fees } = movement
      const symb = movement[symbolFieldName]

      return (
        symb === currSymb &&
        Number.isFinite(fees)
      )
        ? sum + fees
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
  const movementsModel = getModelsMap().get(ALLOWED_COLLS.MOVEMENTS)
  const methodColl = getMethodCollMap().get('_getMovements')
  const {
    dateFieldName,
    symbolFieldName
  } = methodColl

  const baseFilter = getInsertableArrayObjectsFilter(
    methodColl,
    {
      start,
      end
    }
  )

  const movements = await dao.getElemsInCollBy(
    ALLOWED_COLLS.MOVEMENTS,
    {
      filter: {
        ...baseFilter,
        user_id,
        [symbolFieldName]: symbol
      },
      sort: [['mtsUpdated', -1]],
      projection: movementsModel,
      exclude: ['user_id'],
      isExcludePrivate: true
    }
  )
  const res = groupByTimeframe(
    movements,
    timeframe,
    symbol,
    dateFieldName,
    symbolFieldName,
    _calcData
  )

  return res
}
