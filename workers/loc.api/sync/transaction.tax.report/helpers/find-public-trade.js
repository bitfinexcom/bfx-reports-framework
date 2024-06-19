'use strict'

const { PubTradeFindForTrxTaxError } = require('../../../errors')

module.exports = (pubTrades, mts) => {
  if (
    !Array.isArray(pubTrades) ||
    pubTrades.length === 0 ||
    !Number.isFinite(pubTrades[0]?.mts) ||
    !Number.isFinite(pubTrades[pubTrades.length - 1]?.mts) ||
    pubTrades[0]?.mts > mts ||
    pubTrades[pubTrades.length - 1]?.mts < mts
  ) {
    throw new PubTradeFindForTrxTaxError()
  }

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
