'use strict'

const TrxPriceCalculator = require('./trx.price.calculator')

module.exports = (symbol, trxPriceCalculator) => {
  if (trxPriceCalculator?.kindOfCcyForTriangulation === TrxPriceCalculator.IS_FOREX_CCY_FOR_TRIANGULATION) {
    const symbSeparator = (
      symbol.length > 3 ||
      trxPriceCalculator.CRYPTO_CCY_FOR_TRIANGULATION > 3
    )
      ? ':'
      : ''

    return `t${trxPriceCalculator.CRYPTO_CCY_FOR_TRIANGULATION}${symbSeparator}${symbol}`
  }

  const symbSeparator = symbol.length > 3
    ? ':'
    : ''

  return `t${symbol}${symbSeparator}USD`
}
