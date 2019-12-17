'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

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

decorate(injectable(), TradedVolume)
decorate(inject(TYPES.Trades), TradedVolume, 0)

module.exports = TradedVolume
