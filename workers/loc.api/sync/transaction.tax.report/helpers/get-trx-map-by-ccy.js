'use strict'

const { isForexSymb } = require('../../helpers')
const PRIORITY_CURRENCY_LIST = require('./priority.currency.list')
const TrxPriceCalculator = require('./trx.price.calculator')

// Handle tETHF0:USTF0 symbols
const symbRegExpNormalizer = /F0$/i

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

    if (isFirstSymbForex) {
      if (!trxMapByCcy.has(lastSymb)) {
        trxMapByCcy.set(lastSymb, [])
      }

      trxMapByCcy.get(lastSymb).push(new TrxPriceCalculator(
        trx,
        TrxPriceCalculator.LAST_SYMB_PRICE_PROP_NAME,
        TrxPriceCalculator.FIRST_SYMB_PRICE_PROP_NAME
      ))

      continue
    }
    if (isLastSymbForex) {
      if (!trxMapByCcy.has(firstSymb)) {
        trxMapByCcy.set(firstSymb, [])
      }

      trxMapByCcy.get(firstSymb).push(new TrxPriceCalculator(
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
      if (!trxMapByCcy.has(firstSymb)) {
        trxMapByCcy.set(firstSymb, [])
      }

      trxMapByCcy.get(firstSymb).push(new TrxPriceCalculator(
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
      if (!trxMapByCcy.has(lastSymb)) {
        trxMapByCcy.set(lastSymb, [])
      }

      trxMapByCcy.get(lastSymb).push(new TrxPriceCalculator(
        trx,
        TrxPriceCalculator.LAST_SYMB_PRICE_PROP_NAME,
        TrxPriceCalculator.FIRST_SYMB_PRICE_PROP_NAME
      ))

      continue
    }

    if (!trxMapByCcy.has(firstSymb)) {
      trxMapByCcy.set(firstSymb, [])
    }

    trxMapByCcy.get(firstSymb).push(new TrxPriceCalculator(
      trx,
      TrxPriceCalculator.FIRST_SYMB_PRICE_PROP_NAME,
      TrxPriceCalculator.LAST_SYMB_PRICE_PROP_NAME
    ))
  }

  return trxMapByCcy
}
