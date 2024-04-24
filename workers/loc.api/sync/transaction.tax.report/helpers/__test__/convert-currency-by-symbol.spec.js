'use strict'

const { assert } = require('chai')

const convertCurrencyBySymbol = require('../convert-currency-by-symbol')

const {
  getMockedTrxMapByCcy
} = require('./helpers')
const {
  testConvertedCurrencyBySymbol
} = require('./test-cases')

const mockTrades = [
  {
    mtsCreate: Date.UTC(2024, 0, 9, 17),
    symbol: 'tBTCJPY',
    execPrice: 6_041_453
  },
  {
    mtsCreate: Date.UTC(2024, 0, 9, 16, 1),
    symbol: 'tBTCGBP',
    execPrice: 30_550
  },

  {
    mtsCreate: Date.UTC(2024, 0, 8, 16),
    symbol: 'tBTCEUR',
    execPrice: 33_000
  },
  {
    mtsCreate: Date.UTC(2024, 0, 8, 15),
    symbol: 'tBTCUSD',
    execPrice: 0,
    isMovements: true
  },
  {
    mtsCreate: Date.UTC(2024, 0, 8, 14),
    symbol: 'tETHBTC',
    execPrice: 0.512
  },
  {
    mtsCreate: Date.UTC(2024, 0, 8, 14),
    symbol: 'tETHBTC',
    execPrice: 0.511
  },

  {
    mtsCreate: Date.UTC(2024, 0, 5, 9),
    symbol: 'tBTCUSD',
    execPrice: 0,
    isMovements: true
  },

  {
    mtsCreate: Date.UTC(2024, 0, 5, 7),
    symbol: 'tBTCUST',
    execPrice: 20_050
  }
]
const mockedPubTrades = [
  { mts: Date.UTC(2024, 0, 9, 17, 1), price: 39_400 },
  { mts: Date.UTC(2024, 0, 9, 16, 50), price: 39_000 },
  { mts: Date.UTC(2024, 0, 9, 16, 1), price: 38_000 },

  { mts: Date.UTC(2024, 0, 8, 16), price: 35_000 },
  { mts: Date.UTC(2024, 0, 8, 15, 30), price: 22_700 },
  { mts: Date.UTC(2024, 0, 8, 14, 30), price: 22_500 },
  { mts: Date.UTC(2024, 0, 8, 14), price: 22_000 },

  { mts: Date.UTC(2024, 0, 5, 10), price: 21_300 },
  { mts: Date.UTC(2024, 0, 5, 9), price: 21_000 },
  { mts: Date.UTC(2024, 0, 5, 8), price: 21_100 }
]

describe('convertCurrencyBySymbol helper for trx tax report', () => {
  it('should convert trx BTC to USD using pub trades', function () {
    const mockedTrxMapByCcy = getMockedTrxMapByCcy(mockTrades)
    const trxData = mockedTrxMapByCcy.get('BTC')

    convertCurrencyBySymbol(trxData, mockedPubTrades)

    assert.isArray(trxData)
    assert.lengthOf(trxData, 8)

    testConvertedCurrencyBySymbol(trxData, 0, {
      mtsCreate: Date.UTC(2024, 0, 9, 17),
      symbol: 'tBTCJPY',
      execPrice: 6_041_453,
      firstSymbPrice: 39_000,
      lastSymbPrice: 39_000 / 6_041_453
    })
    testConvertedCurrencyBySymbol(trxData, 1, {
      mtsCreate: Date.UTC(2024, 0, 9, 16, 1),
      symbol: 'tBTCGBP',
      execPrice: 30_550,
      firstSymbPrice: 38_000,
      lastSymbPrice: 38_000 / 30_550
    })
    testConvertedCurrencyBySymbol(trxData, 2, {
      mtsCreate: Date.UTC(2024, 0, 8, 16),
      symbol: 'tBTCEUR',
      execPrice: 33_000,
      firstSymbPrice: 35_000,
      lastSymbPrice: 35_000 / 33_000
    })
    testConvertedCurrencyBySymbol(trxData, 3, {
      mtsCreate: Date.UTC(2024, 0, 8, 15),
      symbol: 'tBTCUSD',
      execPrice: 22_500,
      firstSymbPrice: 22_500,
      lastSymbPrice: 1
    })
    testConvertedCurrencyBySymbol(trxData, 4, {
      mtsCreate: Date.UTC(2024, 0, 8, 14),
      symbol: 'tETHBTC',
      execPrice: 0.512,
      firstSymbPrice: null,
      lastSymbPrice: 22_000
    })
    testConvertedCurrencyBySymbol(trxData, 5, {
      mtsCreate: Date.UTC(2024, 0, 8, 14),
      symbol: 'tETHBTC',
      execPrice: 0.511,
      firstSymbPrice: null,
      lastSymbPrice: 22_000
    })
    testConvertedCurrencyBySymbol(trxData, 6, {
      mtsCreate: Date.UTC(2024, 0, 5, 9),
      symbol: 'tBTCUSD',
      execPrice: 21_000,
      firstSymbPrice: 21_000,
      lastSymbPrice: 1
    })
    testConvertedCurrencyBySymbol(trxData, 7, {
      mtsCreate: Date.UTC(2024, 0, 5, 7),
      symbol: 'tBTCUST',
      execPrice: 20_050,
      firstSymbPrice: 21_100,
      lastSymbPrice: null
    })
  })
})
