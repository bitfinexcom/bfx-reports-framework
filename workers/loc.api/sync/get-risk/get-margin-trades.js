'use strict'

const {
  getInsertableArrayObjectsFilter
} = require('bfx-report/workers/loc.api/sync/dao/helpers')

const { convertDataCurr } = require('../helpers')
const ALLOWED_COLLS = require('../allowed.colls')
const {
  getModelsMap,
  getMethodCollMap
} = require('../schema')
const { groupByTimeframe } = require('./helpers')

const _checkFeeFn = (item) => {
  const regExp = new RegExp(`${item.feeCurrency}$`)

  return !regExp.test(item.symbol)
}

const _getCandlesSymb = (item) => item.symbol

const _getTradesConvSchema = (convertTo) => {
  return {
    convertTo,
    symbolFieldName: 'symbol',
    dateFieldName: 'mtsCreate',
    convFields: [
      { inputField: 'execAmount', outputField: 'execAmountForex' },
      { inputField: 'fee', outputField: 'feeForex', checkFn: _checkFeeFn }
    ],
    getCandlesSymbFn: _getCandlesSymb
  }
}

const _calcTradesData = (
  data = [],
  symbolFieldName,
  symbol = [],
  dao
) => {
  return symbol.reduce(async (accum, currSymb) => {
    const _accum = await accum
    const _sum = await data.reduce(async (currSum, trade) => {
      const _currSum = await currSum
      const symb = trade[symbolFieldName]
      const regExp = new RegExp(`${currSymb}$`)

      if (!regExp.test(symb)) {
        return _currSum
      }

      const tradesConvSchema = _getTradesConvSchema(currSymb)
      const {
        execAmountForex,
        feeForex,
        fee
      } = await convertDataCurr(dao, trade, tradesConvSchema)

      const sumWithExecAmountForex = Number.isFinite(execAmountForex)
        ? _currSum + execAmountForex
        : _currSum
      const _feeForex = _checkFeeFn(trade) ? feeForex : fee
      const sumWithFeeForex = Number.isFinite(_feeForex)
        ? sumWithExecAmountForex + _feeForex
        : sumWithExecAmountForex

      return sumWithFeeForex
    }, Promise.resolve(0))
    const res = _sum ? { [currSymb]: _sum } : {}

    return {
      ..._accum,
      ...res
    }
  }, Promise.resolve({}))
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
  const tradesRes = await groupByTimeframe(
    trades,
    timeframe,
    symbol,
    dateFieldName,
    symbolFieldName,
    _calcTradesData,
    dao
  )

  // TODO:
  return tradesRes
}
