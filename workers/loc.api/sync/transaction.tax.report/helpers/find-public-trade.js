'use strict'

module.exports = (pubTrades, mts) => {
  let startIndex = 0
  let endIndex = pubTrades.length - 1
  let middleIndex = null

  while (startIndex <= endIndex) {
    middleIndex = Math.floor((startIndex + endIndex) / 2)

    if (pubTrades[middleIndex]?.mts === mts) {
      return pubTrades[middleIndex]
    }
    if (mts < pubTrades[middleIndex]?.mts) {
      endIndex = middleIndex - 1
    }
    if (mts > pubTrades[middleIndex]?.mts) {
      startIndex = middleIndex + 1
    }
  }

  return pubTrades[middleIndex]
}
