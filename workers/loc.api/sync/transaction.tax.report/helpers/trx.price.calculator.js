'use strict'

const { PubTradePriceFindForTrxTaxError } = require('../../../errors')

class TrxPriceCalculator {
  static FIRST_SYMB_PRICE_PROP_NAME = 'firstSymbPriceUsd'
  static LAST_SYMB_PRICE_PROP_NAME = 'lastSymbPriceUsd'

  constructor (
    trx,
    convPricePropName,
    calcPricePropName
  ) {
    this.trx = trx
    this.convPricePropName = convPricePropName
    this.calcPricePropName = calcPricePropName
  }

  calcPrice (pubTradePrice) {
    if (
      !Number.isFinite(pubTradePrice) ||
      pubTradePrice === 0
    ) {
      throw new PubTradePriceFindForTrxTaxError()
    }

    this.trx[this.convPricePropName] = pubTradePrice

    if (this.trx.isAdditionalTrxMovements) {
      this.trx.execPrice = pubTradePrice
    }
    if (
      !Number.isFinite(this.trx.execPrice) ||
      this.trx.execPrice === 0
    ) {
      return
    }
    if (this.constructor.FIRST_SYMB_PRICE_PROP_NAME === this.calcPricePropName) {
      const priceUsd = this.#calcFirstSymbPrice(pubTradePrice)
      this.trx[this.calcPricePropName] = priceUsd
      this.trx.exactUsdValue = this.trx.execAmount * priceUsd

      return
    }

    const priceUsd = this.#calcLastSymbPrice(pubTradePrice)
    this.trx[this.calcPricePropName] = priceUsd
    this.trx.exactUsdValue = this.trx.execAmount * pubTradePrice
  }

  #calcFirstSymbPrice (pubTradePrice) {
    return pubTradePrice * this.trx.execPrice
  }

  #calcLastSymbPrice (pubTradePrice) {
    return pubTradePrice / this.trx.execPrice
  }
}

module.exports = TrxPriceCalculator
