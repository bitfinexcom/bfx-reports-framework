'use strict'

module.exports = (timeframe, params) => {
  const {
    propName = 'mts',
    alias = 'timeframe'
  } = { ...params }

  const day = timeframe === 'day' ? '-%m-%d' : ''
  const month = timeframe === 'month' ? '-%m' : ''
  const year = '%Y'

  return `strftime(
    '${year}${month}${day}',
    ${propName}/1000,
    'unixepoch'
  ) AS ${alias}`
}
