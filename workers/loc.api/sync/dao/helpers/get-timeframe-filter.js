'use strict'

const _getFilter = (
  timeframe,
  timeframeFieldName,
  isTimeframeArray
) => {
  const condition = isTimeframeArray ? '$in' : '$eq'

  return { [condition]: { [timeframeFieldName]: timeframe } }
}

module.exports = (timeframe, timeframeFieldName) => {
  if (
    !timeframeFieldName ||
    typeof timeframeFieldName !== 'string'
  ) {
    return {}
  }
  if (typeof timeframe === 'string') {
    return _getFilter(timeframe, timeframeFieldName)
  }
  if (
    Array.isArray(timeframe) &&
    timeframe.length > 0 &&
    timeframe.every((tFrame) => typeof tFrame === 'string')
  ) {
    return timeframe.length === 1
      ? _getFilter(timeframe[0], timeframeFieldName)
      : _getFilter(timeframe, timeframeFieldName, true)
  }

  return {}
}
