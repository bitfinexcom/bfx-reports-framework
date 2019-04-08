'use strrict'

const moment = require('moment')

const getStartMtsByTimeframe = require('./get-start-mts-by-timeframe')

module.exports = (
  start,
  end,
  timeframe = 'year'
) => {
  const _start = getStartMtsByTimeframe(start, timeframe)
  const _end = getStartMtsByTimeframe(end, timeframe)
  const startMoment = moment.utc(_start)
  const endMoment = moment.utc(_end)
  const currMoment = startMoment.clone()
  const res = []

  while (true) {
    if (
      !currMoment.isValid() ||
      !currMoment.isBetween(startMoment, endMoment, null, '[]')
    ) {
      break
    }

    res.unshift({ mts: currMoment.valueOf() })

    if (timeframe === 'day') {
      currMoment.add(1, 'days')

      continue
    }
    if (timeframe === 'month') {
      currMoment.add(1, 'months')

      continue
    }

    currMoment.add(1, 'years')
  }

  return res
}
