'use strict'

const {
  mockTradesForNextYear,
  mockTrades
} = require('./mock-trades')
const getMockedTrades = require('./get-mocked-trades')
const mockMovements = require('./mock-movements')
const getMockedMovements = require('./get-mocked-movements')
const getMockedTrxMapByCcy = require('./get-mocked-trx-map-by-ccy')

module.exports = {
  mockTradesForNextYear,
  mockTrades,
  getMockedTrades,
  mockMovements,
  getMockedMovements,
  getMockedTrxMapByCcy
}
