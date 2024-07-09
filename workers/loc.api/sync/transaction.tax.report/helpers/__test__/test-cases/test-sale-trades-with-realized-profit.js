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
    gainOrLoss,
    type
  } = props ?? {}

  assert.isObject(trade)

  assert.isString(trade.asset)
  assert.equal(trade.asset, asset)
  assert.isNumber(trade.amount)
  assert.equal(trade.amount, amount)
  assert.isNumber(trade.mtsAcquired)
  assert.equal(trade.mtsAcquired, mtsAcquired)

  if (mtsSold === null) {
    assert.isNull(trade.mtsSold)
  } else {
    assert.isNumber(trade.mtsSold)
    assert.equal(trade.mtsSold, mtsSold)
  }

  assert.isNumber(trade.proceeds)
  assert.equal(trade.proceeds, proceeds)

  if (cost === null) {
    assert.isNull(trade.cost)
  } else {
    assert.isNumber(trade.cost)
    assert.equal(trade.cost, cost)
  }

  assert.isNumber(trade.gainOrLoss)
  assert.equal(trade.gainOrLoss, gainOrLoss)
  assert.isString(trade.type)
  assert.equal(trade.type, type)
}
