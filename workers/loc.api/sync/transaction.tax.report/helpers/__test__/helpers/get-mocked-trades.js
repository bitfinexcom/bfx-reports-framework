'use strict'

const splitSymbolPairs = require(
  'bfx-report/workers/loc.api/helpers/split-symbol-pairs'
)

module.exports = (mockTrades, opts) => {
  const missingFields = {
    _id: 1,
    id: 1,
    orderID: 1,
    orderType: 'EXCHANGE LIMIT',
    orderPrice: null,
    maker: 1,
    fee: -0.5,
    feeCurrency: 'USD',
    subUserId: null,
    user_id: 1,

    firstSymb: null,
    lastSymb: null,
    firstSymbPrice: null,
    lastSymbPrice: null
  }

  return mockTrades.map((trade, i) => {
    const isMovements = opts?.isMovements ?? trade?.isMovements
    const [firstSymb, lastSymb] = splitSymbolPairs(trade.symbol)

    return {
      ...missingFields,

      isMovements,
      _id: i + 1,
      id: i + 1,
      orderID: i + 1,
      orderPrice: trade.execPrice,
      firstSymb,
      lastSymb,
      firstSymbPrice: lastSymb === 'USD' ? trade.execPrice : null,
      lastSymbPrice: lastSymb === 'USD' ? 1 : null,

      ...trade,

      mtsCreate: opts?.year
        ? new Date(trade.mtsCreate).setUTCFullYear(opts?.year)
        : trade.mtsCreate
    }
  })
}
