'use strict'

const { assert } = require('chai')

module.exports = (arr, index, props) => {
  const payload = arr[index]
  const {
    symbol,
    end,
    start
  } = props ?? {}

  assert.isObject(payload)
  assert.isString(payload.symbol)
  assert.equal(payload.symbol, symbol)
  assert.isNumber(payload.end)
  assert.equal(payload.end, end)

  if (start) {
    assert.isNumber(payload.start)
    assert.equal(payload.start, start)
  } else {
    assert.isNull(payload.start)
  }
}
