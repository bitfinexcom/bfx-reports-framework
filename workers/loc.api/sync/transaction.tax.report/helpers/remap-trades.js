'use strict'

const BigNumber = require('bignumber.js')
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
    trade.isTaxablePayment = false
    trade.isAirdropOnWallet = false
    trade.isMarginFundingPayment = false
    trade.isAffiliateRebate = false
    trade.isStakingPayments = false
    trade.isMovements = false
    trade.isLedgers = false
    trade.isTrades = true
    trade.isDerivative = firstSymb.endsWith('F0')
    trade.isMarginTrading = !trade._isExchange

    remappedTrxs.push(trade)

    if (lastSymb === 'USD') {
      trade.firstSymbPriceUsd = trade.execPrice
      trade.lastSymbPriceUsd = 1

      continue
    }
    if (
      Number.isFinite(trade.exactUsdValue) &&
      trade.exactUsdValue !== 0
    ) {
      trade.firstSymbPriceUsd = new BigNumber(trade.exactUsdValue)
        .div(trade.execAmount)
        .abs()
        .toNumber()
      trade.lastSymbPriceUsd = new BigNumber(trade.exactUsdValue)
        .div(new BigNumber(trade.execAmount).times(trade.execPrice))
        .abs()
        .toNumber()

      continue
    }

    remappedTrxsForConvToUsd.push(trade)
  }

  return params
}
