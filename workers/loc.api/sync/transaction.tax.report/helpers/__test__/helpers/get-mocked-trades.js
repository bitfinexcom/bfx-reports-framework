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
    firstSymbPriceUsd: null,
    lastSymbPriceUsd: null
  }

  return mockTrades.map((trade, i) => {
    const isAdditionalTrxMovements = opts?.isAdditionalTrxMovements ??
      trade?.isAdditionalTrxMovements ??
      trade?.isMovements ??
      trade?.isLedgers
    const [firstSymb, lastSymb] = splitSymbolPairs(trade.symbol)

    return {
      ...missingFields,

      isAdditionalTrxMovements,
      isMovements: !!trade?.isMovements,
      isLedgers: !!trade?.isLedgers,
      isTrades: !isAdditionalTrxMovements,
      _id: i + 1,
      id: i + 1,
      orderID: i + 1,
      orderPrice: trade.execPrice,
      firstSymb,
      lastSymb,
      firstSymbPriceUsd: lastSymb === 'USD' ? trade.execPrice : null,
      lastSymbPriceUsd: lastSymb === 'USD' ? 1 : null,

      ...trade,

      mtsCreate: opts?.year
        ? new Date(trade.mtsCreate).setUTCFullYear(opts?.year)
        : trade.mtsCreate
    }
  })
}
