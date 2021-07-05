'use strrict'

const moment = require('moment')

const getStartMtsByTimeframe = require(
  './get-start-mts-by-timeframe'
)
const setMtsToStartingAndEndingFrames = require(
  './set-mts-to-starting-and-ending-frames'
)

module.exports = (
  start,
  end,
  timeframe = 'year',
  isSetMtsToStartingAndEndingFrames
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

    const mts = currMoment.valueOf()

    res.unshift({
      mts,
      vals: { mts }
    })

    if (timeframe === 'day') {
      currMoment.add(1, 'days')

      continue
    }
    if (timeframe === 'week') {
      currMoment.add(1, 'weeks')

      continue
    }
    if (timeframe === 'month') {
      currMoment.add(1, 'months')

      continue
    }

    currMoment.add(1, 'years')
  }

  return isSetMtsToStartingAndEndingFrames
    ? setMtsToStartingAndEndingFrames(res, start, end)
    : res
}
