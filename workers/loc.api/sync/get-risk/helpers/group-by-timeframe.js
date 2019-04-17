'use strict'

const getStartMtsByTimeframe = require('./get-start-mts-by-timeframe')

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
      getStartMtsByTimeframe(first, timeframe) > getStartMtsByTimeframe(last, timeframe)
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

const _isNotEmptyGroupItem = ({ mts, vals }) => {
  return (
    Number.isInteger(mts) &&
    vals &&
    typeof vals === 'object' &&
    Object.keys(vals).length > 0
  )
}

const _getGroupItem = async (
  data,
  timeframe,
  symbol,
  dateFieldName,
  symbolFieldName,
  calcDataFn,
  dao
) => {
  const { last } = _getFirstAndLastDate(data, dateFieldName)
  const mts = getStartMtsByTimeframe(last, timeframe)
  const vals = await calcDataFn(data, symbolFieldName, symbol, dao)

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

module.exports = async (
  data,
  timeframe,
  symbol,
  dateFieldName,
  symbolFieldName,
  calcDataFn,
  dao
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
      const groupItem = await _getGroupItem(
        subRes,
        timeframe,
        symbol,
        dateFieldName,
        symbolFieldName,
        calcDataFn,
        dao
      )

      _addFragment(res, subRes, groupItem)

      continue
    }
    if (_isMonthlyTimeframe(paramsToCheck)) {
      const groupItem = await _getGroupItem(
        subRes,
        timeframe,
        symbol,
        dateFieldName,
        symbolFieldName,
        calcDataFn,
        dao
      )

      _addFragment(res, subRes, groupItem)

      continue
    }
    if (_isYearlyTimeframe(paramsToCheck)) {
      const groupItem = await _getGroupItem(
        subRes,
        timeframe,
        symbol,
        dateFieldName,
        symbolFieldName,
        calcDataFn,
        dao
      )

      _addFragment(res, subRes, groupItem)

      continue
    }
  }

  return res
}
