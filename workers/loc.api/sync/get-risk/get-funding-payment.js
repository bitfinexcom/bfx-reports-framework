'use strict'

const {
  getInsertableArrayObjectsFilter
} = require('bfx-report/workers/loc.api/sync/dao/helpers')

const ALLOWED_COLLS = require('../allowed.colls')
const {
  getModelsMap,
  getMethodCollMap
} = require('../schema')

const _getStartMtsByTimeframe = (ts, timeframe = 'year') => {
  const date = ts instanceof Date ? ts : new Date(ts)
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()

  if (timeframe === 'day') {
    return Date.UTC(
      year,
      month,
      day
    )
  }
  if (timeframe === 'month') {
    return Date.UTC(
      year,
      month
    )
  }

  return Date.UTC(year)
}

const _getMtsDate = (obj, dateFieldName) => {
  return (
    obj &&
    typeof obj === 'object' &&
    Number.isInteger(obj[dateFieldName])
  )
    ? new Date(obj[dateFieldName])
    : null
}

const _getFirstAndLastDate = (data, dateFieldName) => {
  const firstObj = data[0]
  const lastObj = data[data.length - 1]
  const first = _getMtsDate(firstObj, dateFieldName)
  const last = _getMtsDate(lastObj, dateFieldName)

  return { first, last }
}

const _checkTimeframe = ({
  data,
  dateFieldName,
  timeframe,
  isLastIter
}) => {
  const {
    first,
    last
  } = _getFirstAndLastDate(data, dateFieldName)

  return (
    (
      first &&
      last &&
      _getStartMtsByTimeframe(first, timeframe) > _getStartMtsByTimeframe(last, timeframe)
    ) ||
    isLastIter
  )
}

const _isYearlyTimeframe = (params) => {
  if (params.timeframe !== 'year') {
    return false
  }

  return _checkTimeframe(params)
}

const _isMonthlyTimeframe = (params) => {
  if (params.timeframe !== 'month') {
    return false
  }

  return _checkTimeframe(params)
}

const _isDailyTimeframe = (params) => {
  if (params.timeframe !== 'day') {
    return false
  }

  return _checkTimeframe(params)
}

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

const _isNotEmptyGroupItem = ({ mts, vals }) => {
  return (
    Number.isInteger(mts) &&
    vals &&
    typeof vals === 'object' &&
    Object.keys(vals).length > 0
  )
}

const _getGroupItem = (
  data,
  timeframe,
  symbol,
  dateFieldName,
  symbolFieldName
) => {
  const { last } = _getFirstAndLastDate(data, dateFieldName)
  const mts = _getStartMtsByTimeframe(last, timeframe)
  const vals = _calcData(data, symbolFieldName, symbol)

  return {
    mts,
    vals
  }
}

const _addFragment = (res, subRes, groupItem) => {
  if (_isNotEmptyGroupItem(groupItem)) {
    res.unshift(groupItem)
  }

  subRes.splice(0, subRes.length)
}

const _groupByTimeframe = (
  data,
  timeframe,
  symbol,
  dateFieldName,
  symbolFieldName
) => {
  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    return data
  }

  const res = []
  const subRes = []

  for (let i = data.length - 1; i >= 0; i -= 1) {
    const item = data[i]
    const isLastIter = i === 0
    const nextItem = data[i - 1]
    const resToCheck = [nextItem, ...subRes]
    const paramsToCheck = {
      data: resToCheck,
      dateFieldName,
      timeframe,
      isLastIter
    }

    if (
      item &&
      typeof item === 'object' &&
      Number.isInteger(item[dateFieldName]) &&
      typeof item[symbolFieldName] === 'string'
    ) {
      subRes.unshift(item)
    }
    if (_isDailyTimeframe(paramsToCheck)) {
      const groupItem = _getGroupItem(
        subRes,
        timeframe,
        symbol,
        dateFieldName,
        symbolFieldName
      )

      _addFragment(res, subRes, groupItem)

      continue
    }
    if (_isMonthlyTimeframe(paramsToCheck)) {
      const groupItem = _getGroupItem(
        subRes,
        timeframe,
        symbol,
        dateFieldName,
        symbolFieldName
      )

      _addFragment(res, subRes, groupItem)

      continue
    }
    if (_isYearlyTimeframe(paramsToCheck)) {
      const groupItem = _getGroupItem(
        subRes,
        timeframe,
        symbol,
        dateFieldName,
        symbolFieldName
      )

      _addFragment(res, subRes, groupItem)

      continue
    }
  }

  return res
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
        currency: symbol
      },
      sort: [['mts', -1]],
      projection: ledgersModel,
      exclude: ['user_id'],
      isExcludePrivate: true
    }
  )
  const res = _groupByTimeframe(
    ledgers,
    timeframe,
    symbol,
    dateFieldName,
    symbolFieldName
  )

  return res
}
