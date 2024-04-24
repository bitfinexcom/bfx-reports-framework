'use strict'

const { assert } = require('chai')

module.exports = (arr, index, props) => {
  const { trx } = arr[index]
  const {
    mtsCreate,
    symbol,
    execPrice,
    firstSymbPrice,
    lastSymbPrice
  } = props ?? {}

  assert.isObject(trx)
  assert.isNumber(trx.mtsCreate)
  assert.equal(trx.mtsCreate, mtsCreate)
  assert.isString(trx.symbol)
  assert.equal(trx.symbol, symbol)
  assert.isNumber(trx.execPrice)
  assert.equal(trx.execPrice, execPrice)

  if (firstSymbPrice) {
    assert.isNumber(trx.firstSymbPrice)
    assert.equal(trx.firstSymbPrice, firstSymbPrice)
  } else {
    assert.isNull(trx.firstSymbPrice)
  }
  if (lastSymbPrice) {
    assert.isNumber(trx.lastSymbPrice)
    assert.equal(trx.lastSymbPrice, lastSymbPrice)
  } else {
    assert.isNull(trx.lastSymbPrice)
  }
}
