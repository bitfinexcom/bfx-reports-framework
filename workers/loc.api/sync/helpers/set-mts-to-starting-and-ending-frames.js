'use strict'

const getStartMtsByTimeframe = require(
  './get-start-mts-by-timeframe'
)

const _getMtsIfInTimeframe = (nativeMts, mts, timeframe) => {
  if (
    typeof timeframe !== 'string' ||
    getStartMtsByTimeframe(mts, timeframe) === getStartMtsByTimeframe(nativeMts, timeframe)
  ) {
    return mts
  }

  return nativeMts
}

module.exports = (data, start, end, timeframe) => {
  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    return data
  }

  const endingFrame = data[0]
  const startingFrame = data[data.length - 1]

  if (
    Number.isInteger(end) &&
    endingFrame &&
    typeof endingFrame === 'object' &&
    Number.isInteger(endingFrame.mts)
  ) {
    endingFrame.mts = _getMtsIfInTimeframe(
      endingFrame.mts,
      end,
      timeframe
    )
  }
  if (
    Number.isInteger(start) &&
    data.length > 1 &&
    startingFrame &&
    typeof startingFrame === 'object' &&
    Number.isInteger(startingFrame.mts)
  ) {
    startingFrame.mts = _getMtsIfInTimeframe(
      startingFrame.mts,
      start,
      timeframe
    )
  }

  return data
}
