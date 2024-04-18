'use strict'

const {
  splitSymbolPairs
} = require('bfx-report/workers/loc.api/helpers')

module.exports = (trades, params) => {
  const {
    remapedTrxs,
    remapedTrxsForConvToUsd
  } = params

  for (const trade of trades) {
    if (
      !trade?.symbol ||
      !Number.isFinite(trade?.execAmount) ||
      trade.execAmount === 0 ||
      !Number.isFinite(trade?.execPrice) ||
      trade.execPrice === 0 ||
      !Number.isFinite(trade?.mtsCreate)
    ) {
      continue
    }

    const [firstSymb, lastSymb] = splitSymbolPairs(trade.symbol)
    trade.firstSymb = firstSymb
    trade.lastSymb = lastSymb
    trade.firstSymbPrice = null
    trade.lastSymbPrice = null

    remapedTrxs.push(trade)

    if (lastSymb === 'USD') {
      trade.firstSymbPrice = trade.execPrice
      trade.lastSymbPrice = 1

      continue
    }

    remapedTrxsForConvToUsd.push(trade)
  }

  return params
}
