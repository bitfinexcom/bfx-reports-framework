'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

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

decorate(injectable(), FeesReport)
decorate(inject(TYPES.Trades), FeesReport, 0)

module.exports = FeesReport
