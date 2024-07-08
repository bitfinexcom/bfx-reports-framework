'use strict'

const { isForexSymb } = require('../../helpers')
const PRIORITY_CURRENCY_LIST = require('./priority.currency.list')
const TrxPriceCalculator = require('./trx.price.calculator')

// Handle tETHF0:USTF0 symbols
const symbRegExpNormalizer = /F0$/i

const setCcyCalculator = (map, symb, trxPriceCalculator) => {
  if (!map.has(symb)) {
    map.set(symb, [])
  }

  map.get(symb).push(trxPriceCalculator)
}

const placeTriangulationCcyAtStart = (map) => {
  if (!map.has(TrxPriceCalculator.CRYPTO_CCY_FOR_TRIANGULATION)) {
    return map
  }

  const triangulationCcyCalculators = map.get(TrxPriceCalculator.CRYPTO_CCY_FOR_TRIANGULATION)
  map.delete(TrxPriceCalculator.CRYPTO_CCY_FOR_TRIANGULATION)

  return new Map([
    [TrxPriceCalculator.CRYPTO_CCY_FOR_TRIANGULATION, triangulationCcyCalculators],
    ...map
  ])
}

module.exports = (trxs) => {
  const trxMapByCcy = new Map()

  for (const trx of trxs) {
    const firstSymb = trx.firstSymb.replace(symbRegExpNormalizer, '')
    const lastSymb = trx.lastSymb.replace(symbRegExpNormalizer, '')
    const isFirstSymbForex = isForexSymb(trx.firstSymb)
    const isLastSymbForex = isForexSymb(trx.lastSymb)
    const priorCcyListIndexForFirstSymb = PRIORITY_CURRENCY_LIST
      .indexOf(firstSymb)
    const priorCcyListIndexForLastSymb = PRIORITY_CURRENCY_LIST
      .indexOf(lastSymb)
    const isFirstSymbInPriorCcyList = priorCcyListIndexForFirstSymb >= 0
    const isLastSymbInPriorCcyList = priorCcyListIndexForLastSymb >= 0

    // To Handle tEURUSD etc cases for `_isMarginFundingPayment` etc
    if (
      isFirstSymbForex &&
      lastSymb === 'USD'
    ) {
      const triangulationCcyCalculator = new TrxPriceCalculator(
        trx,
        TrxPriceCalculator.FIRST_SYMB_PRICE_PROP_NAME,
        TrxPriceCalculator.LAST_SYMB_PRICE_PROP_NAME,
        TrxPriceCalculator.IS_CRYPTO_CCY_FOR_TRIANGULATION
      )

      setCcyCalculator(
        trxMapByCcy,
        TrxPriceCalculator.CRYPTO_CCY_FOR_TRIANGULATION,
        triangulationCcyCalculator
      )
      setCcyCalculator(trxMapByCcy, firstSymb, new TrxPriceCalculator(
        trx,
        TrxPriceCalculator.FIRST_SYMB_PRICE_PROP_NAME,
        TrxPriceCalculator.LAST_SYMB_PRICE_PROP_NAME,
        TrxPriceCalculator.IS_FOREX_CCY_FOR_TRIANGULATION,
        triangulationCcyCalculator
      ))

      continue
    }
    if (isFirstSymbForex) {
      setCcyCalculator(trxMapByCcy, lastSymb, new TrxPriceCalculator(
        trx,
        TrxPriceCalculator.LAST_SYMB_PRICE_PROP_NAME,
        TrxPriceCalculator.FIRST_SYMB_PRICE_PROP_NAME
      ))

      continue
    }
    if (isLastSymbForex) {
      setCcyCalculator(trxMapByCcy, firstSymb, new TrxPriceCalculator(
        trx,
        TrxPriceCalculator.FIRST_SYMB_PRICE_PROP_NAME,
        TrxPriceCalculator.LAST_SYMB_PRICE_PROP_NAME
      ))

      continue
    }
    if (
      isFirstSymbInPriorCcyList &&
      (
        !isLastSymbInPriorCcyList ||
        priorCcyListIndexForFirstSymb <= priorCcyListIndexForLastSymb
      )
    ) {
      setCcyCalculator(trxMapByCcy, firstSymb, new TrxPriceCalculator(
        trx,
        TrxPriceCalculator.FIRST_SYMB_PRICE_PROP_NAME,
        TrxPriceCalculator.LAST_SYMB_PRICE_PROP_NAME
      ))

      continue
    }
    if (
      isLastSymbInPriorCcyList &&
      (
        !isFirstSymbInPriorCcyList ||
        priorCcyListIndexForLastSymb <= priorCcyListIndexForFirstSymb
      )
    ) {
      setCcyCalculator(trxMapByCcy, lastSymb, new TrxPriceCalculator(
        trx,
        TrxPriceCalculator.LAST_SYMB_PRICE_PROP_NAME,
        TrxPriceCalculator.FIRST_SYMB_PRICE_PROP_NAME
      ))

      continue
    }

    setCcyCalculator(trxMapByCcy, firstSymb, new TrxPriceCalculator(
      trx,
      TrxPriceCalculator.FIRST_SYMB_PRICE_PROP_NAME,
      TrxPriceCalculator.LAST_SYMB_PRICE_PROP_NAME
    ))
  }

  // To Handle tEURUSD etc cases, first get price for `BTCUSD`, then rest eg `BTCEUR`
  return placeTriangulationCcyAtStart(trxMapByCcy)
}
