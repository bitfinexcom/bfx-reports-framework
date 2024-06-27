'use strict'

const { assert } = require('chai')
const BigNumber = require('bignumber.js')

module.exports = (arr, index, props) => {
  const trade = arr[index]
  const {
    isAdditionalTrxMovements,
    mtsCreate,
    firstSymb,
    lastSymb,
    execAmount,
    execPrice,

    buyFilledAmount
  } = props ?? {}

  assert.isObject(trade)
  assert.isBoolean(trade.isBuyTradesWithUnrealizedProfitForPrevPeriod)
  assert.isOk(trade.isBuyTradesWithUnrealizedProfitForPrevPeriod)
  assert.isBoolean(trade.isBuyTrx)
  assert.isOk(trade.isBuyTrx)
  assert.isBoolean(trade.isBuyTrxHistFilled)
  assert.isNotOk(trade.isBuyTrxHistFilled)
  assert.instanceOf(trade.proceedsForBuyTrxUsd, BigNumber)
  assert.equal(trade.proceedsForBuyTrxUsd.toNumber(), 0)
  assert.instanceOf(trade.proceedsForBuyTrxUsd, BigNumber)
  assert.equal(trade.proceedsForBuyTrxUsd.toNumber(), 0)
  assert.isNumber(trade.firstSymbPriceUsd)
  assert.isNumber(trade.lastSymbPriceUsd)
  assert.isArray(trade.saleTrxsForRealizedProfit)

  assert.isBoolean(trade.isAdditionalTrxMovements)
  assert.equal(trade.isAdditionalTrxMovements, isAdditionalTrxMovements)
  assert.isNumber(trade.mtsCreate)
  assert.equal(trade.mtsCreate, mtsCreate)
  assert.isString(trade.firstSymb)
  assert.equal(trade.firstSymb, firstSymb)
  assert.isString(trade.lastSymb)
  assert.equal(trade.lastSymb, lastSymb)
  assert.isNumber(trade.execAmount)
  assert.equal(trade.execAmount, execAmount)
  assert.isNumber(trade.execPrice)
  assert.equal(trade.execPrice, execPrice)

  assert.instanceOf(trade.buyFilledAmount, BigNumber)
  assert.equal(trade.buyFilledAmount.toNumber(), buyFilledAmount)
}
