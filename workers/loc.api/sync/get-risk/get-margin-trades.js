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

const _isAllowedSymb = (currSymb, symbol) => {
  const regExp = new RegExp(`${currSymb}$`)

  return regExp.test(symbol)
}

const _checkFeeFn = (item) => (
  !_isAllowedSymb(item.feeCurrency, item.symbol)
)

const _getTradesConvSchema = () => {
  return {
    symbolFieldName: 'symbol',
    dateFieldName: 'mtsCreate',
    convFields: [
      { inputField: 'execAmount', outputField: 'execAmountForex' },
      { inputField: 'fee', outputField: 'feeForex', checkFn: _checkFeeFn }
    ],
    getCandlesSymbFn: (item) => item.symbol
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
          ? getSumFieldName(item)
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
) => (
  _isAllowedSymb(currSymb, trade.symbol) &&
  Number.isFinite(trade.execAmountForex)
)

const _isAllowedSumTradesFees = (
  trade,
  currSymb
) => (
  _isAllowedSymb(currSymb, trade.symbol) &&
  (
    Number.isFinite(trade.fee) ||
    Number.isFinite(trade.feeForex)
  )
)

const _isAllowedSumPositionsHistoryMarginFunding = (
  positionHistory,
  currSymb
) => (
  _isAllowedSymb(currSymb, positionHistory.symbol) &&
  Number.isFinite(positionHistory.marginFunding)
)

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

const _calcUsedFunding = () => _sumDataItem(
  'marginFunding',
  _isAllowedSumPositionsHistoryMarginFunding
)

const _calcPositions = (
  data = [],
  symbolFieldName,
  symbol = []
) => {
  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    return {}
  }

  return symbol.reduce((accum, currSymb) => {
    const basePriceItem = data.reverse().find(({ basePrice, symbol }) => (
      _isAllowedSymb(currSymb, symbol) &&
      Number.isFinite(basePrice)
    ))
    const closePriceItem = data.find(({ closePrice, symbol }) => (
      _isAllowedSymb(currSymb, symbol) &&
      Number.isFinite(closePrice)
    ))
    const { basePrice } = { ...basePriceItem }
    const { closePrice } = { ...closePriceItem }

    const res = (
      Number.isFinite(basePrice) &&
      Number.isFinite(closePrice)
    )
      ? { [currSymb]: basePrice - closePrice }
      : {}

    return {
      ...accum,
      ...res
    }
  }, {})
}

const _dividePositionsByTrades = (item) => {
  const _item = omit({ ...item }, ['mts'])

  return Object.entries({ ..._item.positions }).reduce((
    accum,
    [symb, position]
  ) => {
    const tradeExecAmount = ({ ..._item.tradesExecAmount })[symb]

    if (
      Number.isFinite(position) &&
      Number.isFinite(tradeExecAmount) &&
      tradeExecAmount !== 0
    ) {
      accum[symb] = position / tradeExecAmount
    }

    return accum
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
  const tradesModel = getModelsMap()
    .get(ALLOWED_COLLS.TRADES)
  const positionsHistoryModel = getModelsMap()
    .get(ALLOWED_COLLS.POSITIONS_HISTORY)
  const tradesMethodColl = getMethodCollMap()
    .get('_getTrades')
  const positionsHistoryMethodColl = getMethodCollMap()
    .get('_getPositionsHistory')
  const {
    dateFieldName: tradesDateFieldName,
    symbolFieldName: tradesSymbolFieldName
  } = tradesMethodColl
  const {
    dateFieldName: positionsHistoryDateFieldName,
    symbolFieldName: positionsHistorySymbolFieldName
  } = tradesMethodColl

  const tradesBaseFilter = getInsertableArrayObjectsFilter(
    tradesMethodColl,
    {
      start,
      end
    }
  )
  const positionsHistoryBaseFilter = getInsertableArrayObjectsFilter(
    positionsHistoryMethodColl,
    {
      start,
      end
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
  const convertedTrades = await _convertTradesCurr(dao, trades)

  const positionsHistory = await dao.getElemsInCollBy(
    ALLOWED_COLLS.POSITIONS_HISTORY,
    {
      filter: {
        ...positionsHistoryBaseFilter,
        user_id
      },
      sort: [['mtsUpdate', -1]],
      projection: positionsHistoryModel,
      exclude: ['user_id'],
      isExcludePrivate: true
    }
  )

  const tradesExecAmount = await groupByTimeframe(
    convertedTrades,
    timeframe,
    symbol,
    tradesDateFieldName,
    tradesSymbolFieldName,
    _calcTradesExecAmount(),
    dao
  )
  const tradesFees = await groupByTimeframe(
    convertedTrades,
    timeframe,
    symbol,
    tradesDateFieldName,
    tradesSymbolFieldName,
    _calcTradesFees(),
    dao
  )
  const positions = await groupByTimeframe(
    positionsHistory,
    timeframe,
    symbol,
    positionsHistoryDateFieldName,
    positionsHistorySymbolFieldName,
    _calcPositions,
    dao
  )
  const usedFunding = await groupByTimeframe(
    positionsHistory,
    timeframe,
    symbol,
    positionsHistoryDateFieldName,
    positionsHistorySymbolFieldName,
    _calcUsedFunding(),
    dao
  )

  const positionsDividedByTrades = calcGroupedData(
    {
      positions,
      tradesExecAmount
    },
    true,
    _dividePositionsByTrades
  )

  const res = calcGroupedData(
    {
      positionsDividedByTrades,
      tradesFees,
      usedFunding
    },
    true
  )

  return res
}
