'use strict'

const TRX_TAX_STRATEGIES = require('./trx.tax.strategies')
const PRIORITY_CURRENCY_LIST = require('./priority.currency.list')
const remapTrades = require('./remap-trades')
const remapMovements = require('./remap-movements')
const lookUpTrades = require('./look-up-trades')

module.exports = {
  TRX_TAX_STRATEGIES,
  PRIORITY_CURRENCY_LIST,
  remapTrades,
  remapMovements,
  lookUpTrades
}
