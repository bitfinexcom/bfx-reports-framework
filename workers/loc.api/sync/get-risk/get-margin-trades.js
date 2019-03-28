'use strict'

const { omit } = require('lodash')

const {
  getInsertableArrayObjectsFilter
} = require('bfx-report/workers/loc.api/sync/dao/helpers')

const { convertDataCurr } = require('../helpers')
const ALLOWED_COLLS = require('../allowed.colls')
const {
  getModelsMap,
  getMethodCollMap
} = require('../schema')
const {
  groupByTimeframe,
  calcGroupedData
} = require('./helpers')

const _checkFeeFn = (item) => {
  const regExp = new RegExp(`${item.feeCurrency}$`)

  return !regExp.test(item.symbol)
}

const _getCandlesSymb = (item) => item.symbol

const _getTradesConvSchema = () => {
  return {
    symbolFieldName: 'symbol',
    dateFieldName: 'mtsCreate',
    convFields: [
      { inputField: 'execAmount', outputField: 'execAmountForex' },
      { inputField: 'fee', outputField: 'feeForex', checkFn: _checkFeeFn }
    ],
    getCandlesSymbFn: _getCandlesSymb
  }
}

const _convertTradesCurr = (dao, trades = []) => {
  const tradesConvSchema = _getTradesConvSchema()

  return convertDataCurr(dao, trades, tradesConvSchema)
}

const _sumDataItem = (
  getSumFieldName,
  isAllowedSumFieldFn = () => true
) => {
  return (
    data = [],
    symbolFieldName,
    symbol = []
  ) => {
    return symbol.reduce((accum, currSymb) => {
      const _sum = data.reduce((currSum, item) => {
        if (!isAllowedSumFieldFn(item, currSymb)) {
          return currSum
        }

        const sumFieldName = typeof getSumFieldName === 'function'
          ? getSumFieldName(item, )
          : getSumFieldName

        return currSum + item[sumFieldName]
      }, 0)
      const res = _sum ? { [currSymb]: _sum } : {}

      return {
        ...accum,
        ...res
      }
    }, {})
  }
}

const _isAllowedSumTradesExecAmount = (
  trade,
  currSymb
) => {
  const regExp = new RegExp(`${currSymb}$`)

  return (
    regExp.test(trade.symbol) &&
    Number.isFinite(trade.execAmountForex)
  )
}

const _isAllowedSumTradesFees = (
  trade,
  currSymb
) => {
  const regExp = new RegExp(`${currSymb}$`)

  return (
    regExp.test(trade.symbol) &&
    (
      Number.isFinite(trade.fee) ||
      Number.isFinite(trade.feeForex)
    )
  )
}

const _calcTradesExecAmount = () => _sumDataItem(
  'execAmountForex',
  _isAllowedSumTradesExecAmount
)

const _calcTradesFees = () => _sumDataItem(
  (trade) => (Number.isFinite(trade.feeForex)
    ? 'feeForex'
    : 'fee'),
  _isAllowedSumTradesFees
)

// TODO:
const _calcUsedFunding = () => {}

// TODO:
const _calcPositions = () => {}

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
  const convertedTrades = await _convertTradesCurr(dao, trades)

  const tradesExecAmount = await groupByTimeframe(
    convertedTrades,
    timeframe,
    symbol,
    dateFieldName,
    symbolFieldName,
    _calcTradesExecAmount(),
    dao
  )
  const tradesFees = await groupByTimeframe(
    convertedTrades,
    timeframe,
    symbol,
    dateFieldName,
    symbolFieldName,
    _calcTradesFees(),
    dao
  )
  const positions = [] // TODO: now it is just mock data
  const usedFunding = [] // TODO: now it is just mock data

  // TODO:
  // const positionsDividedByTrades = calcGroupedData(
  //   {
  //     positions,
  //     tradesExecAmount
  //   },
  //   true,
  //   (item) => {
  //     const _item = omit(item, ['mts'])
  //   }
  // )

  const res = calcGroupedData(
    {
      // positionsDividedByTrades,
      tradesFees,
      usedFunding
    },
    true
  )

  return res
}
