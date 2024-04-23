'use strict'

const testBuyTradesWithUnrealizedProfit = require('./test-buy-trades-with-unrealized-profit')
const testSaleTradesWithRealizedProfit = require('./test-sale-trades-with-realized-profit')
const testRemappedMovements = require('./test-remapped-movements')
const testRemappedTrades = require('./test-remapped-trades')
const testTrxMapByCcy = require('./test-trx-map-by-ccy')
const testPubTradeChunkPayloads = require('./test-pub-trade-chunk-payloads')

module.exports = {
  testBuyTradesWithUnrealizedProfit,
  testSaleTradesWithRealizedProfit,
  testRemappedMovements,
  testRemappedTrades,
  testTrxMapByCcy,
  testPubTradeChunkPayloads
}
