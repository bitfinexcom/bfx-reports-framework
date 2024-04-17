'use strict'

const { assert } = require('chai')

/*
 * It's a simple workaround for passing test with
 * issue `0.1 + 0.2 = 0.30000000000000004`
 */
const truncFloat = (num, precision) => {
  const _precision = precision ?? 13

  return Math.trunc(num * 10 ** _precision) / 10 ** _precision
}

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
  assert.equal(truncFloat(trade.proceeds), proceeds)
  assert.isNumber(trade.cost)
  assert.equal(truncFloat(trade.cost), cost)
  assert.isNumber(trade.gainOrLoss)
  assert.equal(truncFloat(trade.gainOrLoss), gainOrLoss)
}
