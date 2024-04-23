'use strict'

const { assert } = require('chai')

module.exports = (trxMapByCcy, ccy, dataArray) => {
  const array = trxMapByCcy.get(ccy)

  assert.isArray(array)
  assert.lengthOf(array, dataArray.length)

  for (const [i, item] of array.entries()) {
    assert.isObject(dataArray[i])

    const {
      mtsCreate,
      isNotFirstSymbForex,
      isNotLastSymbForex,
      mainPrice,
      secondPrice
    } = dataArray[i]

    assert.isObject(item)
    assert.isBoolean(item.isNotFirstSymbForex)
    assert.equal(item.isNotFirstSymbForex, isNotFirstSymbForex)
    assert.isBoolean(item.isNotLastSymbForex)
    assert.equal(item.isNotLastSymbForex, isNotLastSymbForex)
    assert.isString(item.mainPricePropName)
    assert.isString(item.secondPricePropName)

    assert.isObject(item.trx)
    assert.isNumber(item.trx.mtsCreate)
    assert.equal(item.trx.mtsCreate, mtsCreate)
    assert.isNumber(item.trx[item.mainPricePropName])
    assert.equal(item.trx[item.mainPricePropName], mainPrice)
    assert.isNumber(item.trx[item.secondPricePropName])
    assert.equal(item.trx[item.secondPricePropName], secondPrice)
  }
}
