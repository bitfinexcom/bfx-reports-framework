'use strict'

module.exports = (ts, timeframe = 'year') => {
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
