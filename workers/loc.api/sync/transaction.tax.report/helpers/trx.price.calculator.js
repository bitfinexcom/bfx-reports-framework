'use strict'

const BigNumber = require('bignumber.js')

const { PubTradePriceFindForTrxTaxError } = require('../../../errors')

class TrxPriceCalculator {
  static FIRST_SYMB_PRICE_PROP_NAME = 'firstSymbPriceUsd'
  static LAST_SYMB_PRICE_PROP_NAME = 'lastSymbPriceUsd'

  static CRYPTO_CCY_FOR_TRIANGULATION = 'BTC'
  static IS_CRYPTO_CCY_FOR_TRIANGULATION = 'IS_CRYPTO_CCY_FOR_TRIANGULATION'
  static IS_FOREX_CCY_FOR_TRIANGULATION = 'IS_FOREX_CCY_FOR_TRIANGULATION'

  pubTradePrice = null

  constructor (
    trx,
    convPricePropName,
    calcPricePropName,
    kindOfCcyForTriangulation,
    triangulationCcyCalculator
  ) {
    this.trx = trx
    this.convPricePropName = convPricePropName
    this.calcPricePropName = calcPricePropName
    this.kindOfCcyForTriangulation = kindOfCcyForTriangulation
    this.triangulationCcyCalculator = triangulationCcyCalculator
  }

  /*
   * Example in case `this.kindOfCcyForTriangulation` exists:
   *   - eg. tEURUSD
   *   - if `this.kindOfCcyForTriangulation === IS_CRYPTO_CCY_FOR_TRIANGULATION`, `pubTradePrice` is price for BTC:USD, eg 21_000
   *   - if `this.kindOfCcyForTriangulation === IS_FOREX_CCY_FOR_TRIANGULATION`,`pubTradePrice` is price for BTC:EUR, eg 20_000
   *   - then price EUR:USD will be `20_000 / 21_000`
   */
  calcPrice (pubTradePrice) {
    if (
      !Number.isFinite(pubTradePrice) ||
      pubTradePrice === 0
    ) {
      throw new PubTradePriceFindForTrxTaxError()
    }

    this.pubTradePrice = pubTradePrice

    if (this.kindOfCcyForTriangulation === this.constructor.IS_CRYPTO_CCY_FOR_TRIANGULATION) {
      return
    }
    if (
      this.kindOfCcyForTriangulation === this.constructor.IS_FOREX_CCY_FOR_TRIANGULATION &&
      (
        !(this.triangulationCcyCalculator instanceof TrxPriceCalculator) ||
        !Number.isFinite(this.triangulationCcyCalculator.pubTradePrice) ||
        this.triangulationCcyCalculator.pubTradePrice === 0
      )
    ) {
      throw new PubTradePriceFindForTrxTaxError()
    }

    this.trx[this.convPricePropName] = this.kindOfCcyForTriangulation === this.constructor.IS_FOREX_CCY_FOR_TRIANGULATION
      ? new BigNumber(this.triangulationCcyCalculator.pubTradePrice)
        .div(pubTradePrice)
        .toNumber()
      : pubTradePrice

    if (this.trx.isAdditionalTrxMovements) {
      this.trx.execPrice = this.trx[this.convPricePropName]
    }
    if (
      !Number.isFinite(this.trx.execPrice) ||
      this.trx.execPrice === 0
    ) {
      return
    }
    if (this.constructor.FIRST_SYMB_PRICE_PROP_NAME === this.calcPricePropName) {
      const priceUsd = this.#calcFirstSymbPrice(this.trx[this.convPricePropName])
      this.trx[this.calcPricePropName] = priceUsd
      this.trx.exactUsdValue = new BigNumber(this.trx.execAmount)
        .times(priceUsd)
        .toNumber()

      return
    }

    const priceUsd = this.#calcLastSymbPrice(this.trx[this.convPricePropName])
    this.trx[this.calcPricePropName] = priceUsd
    this.trx.exactUsdValue = new BigNumber(this.trx.execAmount)
      .times(this.trx[this.convPricePropName])
      .toNumber()
  }

  #calcFirstSymbPrice (pubTradePrice) {
    return new BigNumber(pubTradePrice)
      .times(this.trx.execPrice)
      .toNumber()
  }

  #calcLastSymbPrice (pubTradePrice) {
    return new BigNumber(pubTradePrice)
      .div(this.trx.execPrice)
      .toNumber()
  }
}

module.exports = TrxPriceCalculator
