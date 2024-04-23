'use strict'

const { assert } = require('chai')

const getTrxMapByCcy = require('../get-trx-map-by-ccy')

const {
  testTrxMapByCcy
} = require('./test-cases')

const firstSymbPrice = 12345
const lastSymbPrice = 54321

const mockedTrxs = [
  {
    mtsCreate: Date.UTC(2024, 5, 19),
    firstSymb: 'BTC',
    lastSymb: 'USD'
  },
  {
    mtsCreate: Date.UTC(2024, 4, 18),
    firstSymb: 'UST',
    lastSymb: 'EUR'
  },
  {
    mtsCreate: Date.UTC(2024, 3, 21),
    firstSymb: 'ETH',
    lastSymb: 'GBP'
  },
  {
    mtsCreate: Date.UTC(2024, 2, 12),
    firstSymb: 'LTC',
    lastSymb: 'JPY'
  },
  {
    mtsCreate: Date.UTC(2024, 1, 2),
    firstSymb: 'ETH',
    lastSymb: 'BTC'
  },
  {
    mtsCreate: Date.UTC(2024, 0, 8),
    firstSymb: 'UST',
    lastSymb: 'USD'
  }
].map((trx) => ({
  ...trx,
  firstSymbPrice,
  lastSymbPrice
}))

describe('getTrxMapByCcy helper for trx tax report', () => {
  it('Get trx map by currency for conversion to USD', function () {
    const trxMapByCcy = getTrxMapByCcy(mockedTrxs)

    assert.instanceOf(trxMapByCcy, Map)
    assert.lengthOf(trxMapByCcy, 4)

    testTrxMapByCcy(trxMapByCcy, 'BTC', [
      {
        mtsCreate: Date.UTC(2024, 5, 19),
        isNotFirstSymbForex: true,
        isNotLastSymbForex: false,
        mainPrice: firstSymbPrice,
        secondPrice: lastSymbPrice
      },
      {
        mtsCreate: Date.UTC(2024, 1, 2),
        isNotFirstSymbForex: true,
        isNotLastSymbForex: true,
        mainPrice: lastSymbPrice,
        secondPrice: firstSymbPrice
      }
    ])
    testTrxMapByCcy(trxMapByCcy, 'UST', [
      {
        mtsCreate: Date.UTC(2024, 4, 18),
        isNotFirstSymbForex: true,
        isNotLastSymbForex: false,
        mainPrice: firstSymbPrice,
        secondPrice: lastSymbPrice
      },
      {
        mtsCreate: Date.UTC(2024, 0, 8),
        isNotFirstSymbForex: true,
        isNotLastSymbForex: false,
        mainPrice: firstSymbPrice,
        secondPrice: lastSymbPrice
      }
    ])
    testTrxMapByCcy(trxMapByCcy, 'ETH', [
      {
        mtsCreate: Date.UTC(2024, 3, 21),
        isNotFirstSymbForex: true,
        isNotLastSymbForex: false,
        mainPrice: firstSymbPrice,
        secondPrice: lastSymbPrice
      },
      {
        mtsCreate: Date.UTC(2024, 1, 2),
        isNotFirstSymbForex: true,
        isNotLastSymbForex: true,
        mainPrice: firstSymbPrice,
        secondPrice: lastSymbPrice
      }
    ])
    testTrxMapByCcy(trxMapByCcy, 'LTC', [
      {
        mtsCreate: Date.UTC(2024, 2, 12),
        isNotFirstSymbForex: true,
        isNotLastSymbForex: false,
        mainPrice: firstSymbPrice,
        secondPrice: lastSymbPrice
      }
    ])
  })
})
