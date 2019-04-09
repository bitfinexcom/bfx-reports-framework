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
    const _sum = data.reduce((sum, ledger) => {
      const { amount } = ledger
      const symb = ledger[symbolFieldName]

      return (
        symb === currSymb &&
        Number.isFinite(amount)
      )
        ? sum + amount
        : sum
    }, 0)
    const res = _sum ? { [currSymb]: _sum } : {}

    return {
      ...accum,
      ...res
    }
  }, {})
}

module.exports = async ({ dao }, args) => {
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
  const ledgersModel = getModelsMap().get(ALLOWED_COLLS.LEDGERS)
  const methodColl = getMethodCollMap().get('_getLedgers')
  const {
    dateFieldName,
    symbolFieldName
  } = methodColl

  const baseFilter = getInsertableArrayObjectsFilter(
    methodColl,
    {
      start,
      end,
      isMarginFundingPayment: true
    }
  )

  const ledgers = await dao.getElemsInCollBy(
    ALLOWED_COLLS.LEDGERS,
    {
      filter: {
        ...baseFilter,
        user_id,
        [symbolFieldName]: symbol
      },
      sort: [['mts', -1]],
      projection: ledgersModel,
      exclude: ['user_id'],
      isExcludePrivate: true
    }
  )
  const res = await groupByTimeframe(
    ledgers,
    timeframe,
    symbol,
    dateFieldName,
    symbolFieldName,
    _calcData
  )

  return res
}
