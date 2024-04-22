'use strict'

const { assert } = require('chai')

module.exports = (arr, index, props) => {
  const trx = arr[index]
  const {
    mtsCreate,
    symbol,
    firstSymb,
    execAmount
  } = props ?? {}

  assert.isObject(trx)
  assert.isBoolean(trx.isMovements)
  assert.isOk(trx.isMovements)
  assert.isNumber(trx.mtsCreate)
  assert.equal(trx.mtsCreate, mtsCreate)
  assert.isNull(trx.firstSymbPrice)
  assert.isNumber(trx.lastSymbPrice)
  assert.equal(trx.lastSymbPrice, 1)
  assert.isString(trx.symbol)
  assert.equal(trx.symbol, symbol)
  assert.isString(trx.firstSymb)
  assert.equal(trx.firstSymb, firstSymb)
  assert.isString(trx.lastSymb)
  assert.equal(trx.lastSymb, 'USD')
  assert.isNumber(trx.execAmount)
  assert.equal(trx.execAmount, execAmount)
  assert.isNumber(trx.execPrice)
  assert.equal(trx.execPrice, 0)
}
