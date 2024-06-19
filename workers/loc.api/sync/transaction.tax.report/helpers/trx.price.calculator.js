'use strict'

class TrxPriceCalculator {
  static FIRST_SYMB_PRICE_PROP_NAME = 'firstSymbPrice'
  static LAST_SYMB_PRICE_PROP_NAME = 'lastSymbPrice'

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
      // TODO:
      throw new Error('ERR_NO_PUBLIC_TRADES_PRICE')
    }

    this.trx.exactUsdValue = Math.abs(this.trx.execAmount * pubTradePrice)
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
      this.trx[this.calcPricePropName] = this.#calcFirstSymbPrice(pubTradePrice)

      return
    }

    this.trx[this.calcPricePropName] = this.#calcLastSymbPrice(pubTradePrice)
  }

  #calcFirstSymbPrice (pubTradePrice) {
    return pubTradePrice * this.trx.execPrice
  }

  #calcLastSymbPrice (pubTradePrice) {
    return pubTradePrice / this.trx.execPrice
  }
}

module.exports = TrxPriceCalculator
