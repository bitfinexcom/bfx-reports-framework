'use strict'

const {
  mockTradesForNextYear,
  mockTrades
} = require('./mock-trades')
const getMockedTrades = require('./get-mocked-trades')
const mockMovements = require('./mock-movements')
const getMockedMovements = require('./get-mocked-movements')
const getMockedTrxMapByCcy = require('./get-mocked-trx-map-by-ccy')
const getMockedPubTrades = require('./get-mocked-pub-trades')

module.exports = {
  mockTradesForNextYear,
  mockTrades,
  getMockedTrades,
  mockMovements,
  getMockedMovements,
  getMockedTrxMapByCcy,
  getMockedPubTrades
}
