'use strict'

const getMockedTrades = require('./get-mocked-trades')
const getTrxMapByCcy = require('../../get-trx-map-by-ccy')

module.exports = (mockTrades, opts) => {
  const mockedTrades = getMockedTrades(mockTrades, opts)
  const trxMapByCcy = getTrxMapByCcy(mockedTrades)

  return trxMapByCcy
}
