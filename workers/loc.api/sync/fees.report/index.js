'use strict'

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.Trades
]
class FeesReport {
  constructor (
    trades
  ) {
    this.trades = trades
  }

  getFeesReport (args) {
    return this.trades.getGroupedDataIn(
      'feeUsd',
      args
    )
  }
}

decorateInjectable(FeesReport, depsTypes)

module.exports = FeesReport
