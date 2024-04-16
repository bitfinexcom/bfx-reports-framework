'use strict'

const { assert } = require('chai')

module.exports = (arr, index, props) => {
  const trade = arr[index]
  const {
    asset,
    amount,
    mtsAcquired,
    mtsSold,
    proceeds,
    cost,
    gainOrLoss
  } = props ?? {}

  assert.isObject(trade)

  assert.isString(trade.asset)
  assert.equal(trade.asset, asset)
  assert.isNumber(trade.amount)
  assert.equal(trade.amount, amount)
  assert.isNumber(trade.mtsAcquired)
  assert.equal(trade.mtsAcquired, mtsAcquired)
  assert.isNumber(trade.mtsSold)
  assert.equal(trade.mtsSold, mtsSold)
  assert.isNumber(trade.proceeds)
  assert.equal(trade.proceeds, proceeds)
  assert.isNumber(trade.cost)
  assert.equal(trade.cost, cost)
  assert.isNumber(trade.gainOrLoss)
  assert.equal(trade.gainOrLoss, gainOrLoss)
}
