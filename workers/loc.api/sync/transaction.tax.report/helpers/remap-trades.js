'use strict'

const splitSymbolPairs = require(
  'bfx-report/workers/loc.api/helpers/split-symbol-pairs'
)

module.exports = (trades, params) => {
  const {
    remappedTrxs,
    remappedTrxsForConvToUsd
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
    trade.firstSymbPriceUsd = null
    trade.lastSymbPriceUsd = null
    trade.isAdditionalTrxMovements = false
    trade.isMovements = false
    trade.isLedgers = false
    trade.isTrades = true

    remappedTrxs.push(trade)

    if (lastSymb === 'USD') {
      trade.firstSymbPriceUsd = trade.execPrice
      trade.lastSymbPriceUsd = 1

      continue
    }
    if (
      Number.isFinite(trade.exactUsdValue) &&
      trade.exactUsdValue > 0
    ) {
      trade.firstSymbPriceUsd = trade.exactUsdValue / trade.execAmount
      trade.lastSymbPriceUsd = trade.exactUsdValue / trade.execPrice

      continue
    }

    remappedTrxsForConvToUsd.push(trade)
  }

  return params
}
