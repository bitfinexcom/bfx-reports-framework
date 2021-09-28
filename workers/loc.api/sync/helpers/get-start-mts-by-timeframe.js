'use strict'

const moment = require('moment')

module.exports = (ts, timeframe = 'year') => {
  const date = moment.utc(ts)

  const year = date.year()
  const month = date.month()
  const weekYear = date.isoWeekYear()
  const week = date.isoWeek()
  const day = date.dayOfYear()

  const momentDate = moment.utc({ year })

  if (timeframe === 'day') {
    momentDate.dayOfYear(day)

    return momentDate.valueOf()
  }
  if (timeframe === 'week') {
    momentDate.isoWeekYear(weekYear)
    momentDate.isoWeekday(1)
    momentDate.isoWeek(week)

    return momentDate.valueOf()
  }
  if (timeframe === 'month') {
    momentDate.month(month)

    return momentDate.valueOf()
  }

  return momentDate.valueOf()
}
