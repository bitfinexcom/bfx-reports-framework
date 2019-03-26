'use strict'

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
  symbolFieldName,
  calcDataFn
) => {
  const { last } = _getFirstAndLastDate(data, dateFieldName)
  const mts = _getStartMtsByTimeframe(last, timeframe)
  const vals = calcDataFn(data, symbolFieldName, symbol)

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

module.exports = (
  data,
  timeframe,
  symbol,
  dateFieldName,
  symbolFieldName,
  calcDataFn
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
        symbolFieldName,
        calcDataFn
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
        symbolFieldName,
        calcDataFn
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
        symbolFieldName,
        calcDataFn
      )

      _addFragment(res, subRes, groupItem)

      continue
    }
  }

  return res
}
