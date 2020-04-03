'use strict'

module.exports = (data, start, end) => {
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
    endingFrame.mts = end
  }
  if (
    Number.isInteger(start) &&
    data.length > 1 &&
    startingFrame &&
    typeof startingFrame === 'object' &&
    Number.isInteger(startingFrame.mts)
  ) {
    startingFrame.mts = start
  }

  return data
}
