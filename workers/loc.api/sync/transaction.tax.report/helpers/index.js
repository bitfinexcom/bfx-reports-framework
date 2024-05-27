'use strict'

const TRX_TAX_STRATEGIES = require('./trx.tax.strategies')
const remapTrades = require('./remap-trades')
const remapMovements = require('./remap-movements')
const lookUpTrades = require('./look-up-trades')

module.exports = {
  TRX_TAX_STRATEGIES,
  remapTrades,
  remapMovements,
  lookUpTrades
}
