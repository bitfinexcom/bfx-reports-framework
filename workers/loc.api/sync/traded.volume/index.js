'use strict'

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.Trades
]
class TradedVolume {
  constructor (
    trades
  ) {
    this.trades = trades
  }

  getTradedVolume (args) {
    return this.trades.getGroupedDataIn(
      'amountUsd',
      args
    )
  }
}

decorateInjectable(TradedVolume, depsTypes)

module.exports = TradedVolume
