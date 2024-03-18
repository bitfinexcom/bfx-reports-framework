'use strict'

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.Authenticator
]
class TransactionTaxReport {
  constructor (
    dao,
    authenticator
  ) {
    this.dao = dao
    this.authenticator = authenticator
  }

  // TODO:
  async getFullTaxReport (args = {}) {
    const { auth, params } = args ?? {}
    const {
      start = 0,
      end = Date.now()
    } = params ?? {}
    const user = await this.authenticator
      .verifyRequestUser({ auth })

    // TODO:
    return [{
      symbol: 'BTC',
      amount: 0.001,
      mtsAcquired: Date.now(),
      mtsSold: Date.now(),
      proceeds: 2.86,
      cost: 26.932,
      gainOrLoss: -24.072
    }]
  }
}

decorateInjectable(TransactionTaxReport, depsTypes)

module.exports = TransactionTaxReport
