'use strict'

const { assert } = require('chai')

const remapTrades = require('../remap-trades')

const {
  testRemappedTrades
} = require('./test-cases')

const mockedTrades = [
  {
    symbol: 'tUSTEUR',
    mtsCreate: Date.UTC(2024, 5, 19),
    execAmount: 303.2,
    execPrice: 3_123
  },
  {
    symbol: 'tBTCUSD',
    mtsCreate: Date.UTC(2024, 4, 18),
    execAmount: 3.1,
    execPrice: 20_000
  },
  {
    symbol: 'tBTCUSD',
    mtsCreate: Date.UTC(2024, 3, 21),
    execAmount: 0,
    execPrice: 20_000
  },
  {
    symbol: '',
    mtsCreate: Date.UTC(2024, 2, 12),
    execAmount: 4.6,
    execPrice: 20_000
  },
  {
    symbol: 'tETHUSD',
    mtsCreate: Date.UTC(2024, 1, 2),
    execAmount: 4.6,
    execPrice: 0
  },
  {
    symbol: 'tETHUSD',
    mtsCreate: null,
    execAmount: 4.6,
    execPrice: 0.512
  },
  {
    symbol: 'tETHBTC',
    mtsCreate: Date.UTC(2024, 0, 8),
    execAmount: -12.4,
    execPrice: 20_000
  }
]

describe('remapTrades helper for trx tax report', () => {
  it('Remap trades to trx data structure', function () {
    const remappedTrxs = []
    const remappedTrxsForConvToUsd = []
    const params = { remappedTrxs, remappedTrxsForConvToUsd }

    const returnedParams = remapTrades(
      mockedTrades,
      params
    )

    assert.isObject(returnedParams)
    assert.equal(returnedParams, params)
    assert.isArray(returnedParams.remappedTrxs)
    assert.equal(returnedParams.remappedTrxs, remappedTrxs)
    assert.isArray(returnedParams.remappedTrxsForConvToUsd)
    assert.equal(returnedParams.remappedTrxsForConvToUsd, remappedTrxsForConvToUsd)

    assert.equal(remappedTrxs.length, 3)
    assert.equal(remappedTrxsForConvToUsd.length, 2)

    testRemappedTrades(remappedTrxs, 0, {
      mtsCreate: Date.UTC(2024, 5, 19),
      symbol: 'tUSTEUR',
      firstSymb: 'UST',
      lastSymb: 'EUR',
      firstSymbPrice: null,
      lastSymbPrice: null
    })
    testRemappedTrades(remappedTrxs, 1, {
      mtsCreate: Date.UTC(2024, 4, 18),
      symbol: 'tBTCUSD',
      firstSymb: 'BTC',
      lastSymb: 'USD',
      firstSymbPrice: 20_000,
      lastSymbPrice: 1
    })
    testRemappedTrades(remappedTrxs, 2, {
      mtsCreate: Date.UTC(2024, 0, 8),
      symbol: 'tETHBTC',
      firstSymb: 'ETH',
      lastSymb: 'BTC',
      firstSymbPrice: null,
      lastSymbPrice: null
    })

    testRemappedTrades(remappedTrxsForConvToUsd, 0, {
      mtsCreate: Date.UTC(2024, 5, 19),
      symbol: 'tUSTEUR',
      firstSymb: 'UST',
      lastSymb: 'EUR',
      firstSymbPrice: null,
      lastSymbPrice: null
    })
    testRemappedTrades(remappedTrxsForConvToUsd, 1, {
      mtsCreate: Date.UTC(2024, 0, 8),
      symbol: 'tETHBTC',
      firstSymb: 'ETH',
      lastSymb: 'BTC',
      firstSymbPrice: null,
      lastSymbPrice: null
    })
  })
})
