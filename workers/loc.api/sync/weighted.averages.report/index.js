'use strict'

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.Authenticator,
  TYPES.Trades
]
class WeightedAveragesReport {
  constructor (
    dao,
    authenticator,
    trades
  ) {
    this.dao = dao
    this.authenticator = authenticator
    this.trades = trades
  }

  async getWeightedAveragesReport (args = {}) {
    const {
      auth = {},
      params = {}
    } = args ?? {}
    const {
      start = 0,
      end = Date.now(),
      symbol = []
    } = params ?? {}
    const user = await this.authenticator
      .verifyRequestUser({ auth })
    const symbolArr = Array.isArray(symbol)
      ? symbol
      : [symbol]
  }
}

decorateInjectable(WeightedAveragesReport, depsTypes)

module.exports = WeightedAveragesReport
