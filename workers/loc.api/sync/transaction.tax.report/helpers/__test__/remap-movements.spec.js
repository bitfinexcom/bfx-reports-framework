'use strict'

const { assert } = require('chai')

const remapMovements = require('../remap-movements')
const {
  mockMovements,
  getMockedMovements
} = require('./helpers')
const {
  testRemappedMovements
} = require('./test-cases')

describe('remapMovements helper for trx tax report', () => {
  it('Remap movements to trx data structure', function () {
    const remappedTrxs = []
    const remappedTrxsForConvToUsd = []
    const params = { remappedTrxs, remappedTrxsForConvToUsd }

    const returnedParams = remapMovements(
      getMockedMovements(mockMovements),
      params
    )

    assert.isObject(returnedParams)
    assert.equal(returnedParams, params)
    assert.isArray(returnedParams.remappedTrxs)
    assert.equal(returnedParams.remappedTrxs, remappedTrxs)
    assert.isArray(returnedParams.remappedTrxsForConvToUsd)
    assert.equal(returnedParams.remappedTrxsForConvToUsd, remappedTrxsForConvToUsd)

    assert.equal(remappedTrxs.length, 4)
    assert.equal(remappedTrxsForConvToUsd.length, remappedTrxs.length)

    testRemappedMovements(remappedTrxs, 0, {
      mtsCreate: Date.UTC(2023, 8, 29),
      symbol: 'tBTCUSD',
      firstSymb: 'BTC',
      execAmount: -0.9
    })
    testRemappedMovements(remappedTrxs, 1, {
      mtsCreate: Date.UTC(2023, 5, 12),
      symbol: 'tETHUSD',
      firstSymb: 'ETH',
      execAmount: 19.6
    })
    testRemappedMovements(remappedTrxs, 2, {
      mtsCreate: Date.UTC(2023, 3, 21),
      symbol: 'tBTCUSD',
      firstSymb: 'BTC',
      execAmount: 2.4
    })
    testRemappedMovements(remappedTrxs, 3, {
      mtsCreate: Date.UTC(2023, 1, 15),
      symbol: 'tUSTUSD',
      firstSymb: 'UST',
      execAmount: 301
    })
  })
})
