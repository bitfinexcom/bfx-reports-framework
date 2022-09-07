'use strict'

const { decorateInjectable } = require('../../di/utils')

/**
 * Universal data structure for the one sync user step
 */
class SyncUserStepData {
  /**
   * @param {?string} [symbol] - Used to specify synced symbol, can be `_ALL` if all ones are syncing
   * @param {?string} [timeframe] - Used to specify synced timeframe, eg. for candles collection
   * @param {?number} [baseStart] - Used to specify base start mts point to continue first sync
   * @param {?number} [baseEnd] - Used to specify base end mts point to continue first sync
   * @param {?number} [currStart] - Used to specify current start mts point
   * @param {?number} [currEnd] - Used to specify current end mts point
   */
  setParams (
    symbol,
    timeframe,
    baseStart,
    baseEnd,
    currStart,
    currEnd
  ) {
    this.symbol = symbol
    this.timeframe = timeframe
    this.baseStart = baseStart
    this.baseEnd = baseEnd
    this.currStart = currStart
    this.currEnd = currEnd
  }
}

decorateInjectable(SyncUserStepData)

module.exports = SyncUserStepData
