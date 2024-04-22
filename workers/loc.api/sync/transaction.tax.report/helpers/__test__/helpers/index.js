'use strict'

const {
  mockTradesForNextYear,
  mockTrades
} = require('./mock-trades')
const getMockedTrades = require('./get-mocked-trades')
const mockMovements = require('./mock-movements')
const getMockedMovements = require('./get-mocked-movements')

module.exports = {
  mockTradesForNextYear,
  mockTrades,
  getMockedTrades,
  mockMovements,
  getMockedMovements
}
