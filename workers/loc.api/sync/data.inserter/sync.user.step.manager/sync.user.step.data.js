'use strict'

const { ALL_SYMBOLS_TO_SYNC } = require('../const')

const { decorateInjectable } = require('../../../di/utils')

/**
 * Universal data structure for the one sync user step
 */
class SyncUserStepData {
  constructor () {
    this.symbol = null
    this.timeframe = null
    this.baseStart = null
    this.baseEnd = null
    this.currStart = null
    this.currEnd = null
    this.isBaseStepReady = false
    this.isCurrStepReady = false

    this.wasBaseStepsBeSynced = false
    this.wasCurrStepsBeSynced = false
  }

  /**
   * @param {?string} [symbol] - Used to specify synced symbol, can be `_ALL` if all ones are syncing
   * @param {?string} [timeframe] - Used to specify synced timeframe, eg. for candles collection
   * @param {?number} [baseStart] - Used to specify base start mts point to continue first sync
   * @param {?number} [baseEnd] - Used to specify base end mts point to continue first sync
   * @param {?number} [currStart] - Used to specify current start mts point
   * @param {?number} [currEnd] - Used to specify current end mts point
   * @param {?boolean} [isBaseStepReady] - Used to mark base sync step is ready
   * @param {?boolean} [isCurrStepReady] - Used to mark current sync step is ready
   */
  setParams (params = {}) {
    const {
      symbol = this.symbol,
      timeframe = this.timeframe,
      baseStart = this.baseStart,
      baseEnd = this.baseEnd,
      currStart = this.currStart,
      currEnd = this.currEnd,
      isBaseStepReady = this.isBaseStepReady,
      isCurrStepReady = this.isCurrStepReady
    } = params ?? {}

    this.symbol = symbol
    this.timeframe = timeframe
    this.baseStart = baseStart
    this.baseEnd = baseEnd
    this.currStart = currStart
    this.currEnd = currEnd
    this.isBaseStepReady = isBaseStepReady
    this.isCurrStepReady = isCurrStepReady
  }

  getParams (opts) {
    const {
      areStoringParamsReturned = false
    } = opts ?? {}
    const params = areStoringParamsReturned
      ? {}
      : {
          symbol: this.symbol,
          timeframe: this.timeframe
        }

    return {
      ...params,
      baseStart: this.baseStart,
      baseEnd: this.baseEnd,
      currStart: this.currStart,
      currEnd: this.currEnd,
      isBaseStepReady: this.isBaseStepReady,
      isCurrStepReady: this.isCurrStepReady
    }
  }

  get hasSymbol () {
    return (
      this.symbol &&
      typeof this.symbol === 'string'
    )
  }

  get areAllSymbolsRequired () {
    return this.symbol === ALL_SYMBOLS_TO_SYNC
  }

  get hasTimeframe () {
    return (
      this.timeframe &&
      typeof this.timeframe === 'string'
    )
  }

  get hasBaseStep () {
    return (
      Number.isInteger(this.baseStart) &&
      Number.isInteger(this.baseEnd) &&
      this.baseStart < this.baseEnd
    )
  }

  get hasCurrStep () {
    return (
      Number.isInteger(this.currStart) &&
      Number.isInteger(this.currEnd) &&
      this.currStart < this.currEnd
    )
  }
}

decorateInjectable(SyncUserStepData)

module.exports = SyncUserStepData
