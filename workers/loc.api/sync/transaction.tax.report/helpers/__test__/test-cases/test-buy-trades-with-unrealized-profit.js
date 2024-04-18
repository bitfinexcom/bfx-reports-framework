'use strict'

const { assert } = require('chai')

module.exports = (arr, index, props) => {
  const trade = arr[index]
  const {
    isMovements,
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
  assert.isNumber(trade.proceedsForBuyTrx)
  assert.equal(trade.proceedsForBuyTrx, 0)
  assert.isNumber(trade.proceedsForBuyTrx)
  assert.equal(trade.proceedsForBuyTrx, 0)
  assert.isNumber(trade.firstSymbPrice)
  assert.isNumber(trade.lastSymbPrice)
  assert.isArray(trade.saleTrxsForRealizedProfit)

  assert.isBoolean(trade.isMovements)
  assert.equal(trade.isMovements, isMovements)
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

  assert.isNumber(trade.buyFilledAmount)
  assert.equal(trade.buyFilledAmount, buyFilledAmount)
}
