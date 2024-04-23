'use strict'

const { assert } = require('chai')

const getPubTradeChunkPayloads = require('../get-pub-trade-chunk-payloads')

const {
  testPubTradeChunkPayloads
} = require('./test-cases')

describe('getPubTradeChunkPayloads helper for trx tax report', () => {
  it('should push separate request payload for trxs with mts more than 24h', function () {
    const trxData = [
      { mtsCreate: Date.UTC(2024, 10, 11, 12) },

      { mtsCreate: Date.UTC(2024, 8, 15, 11) },
      { mtsCreate: Date.UTC(2024, 8, 15, 10) },

      { mtsCreate: Date.UTC(2024, 0, 9, 17) },
      { mtsCreate: Date.UTC(2024, 0, 9, 16, 1) },

      { mtsCreate: Date.UTC(2024, 0, 8, 16) },
      { mtsCreate: Date.UTC(2024, 0, 8, 15) },
      { mtsCreate: Date.UTC(2024, 0, 8, 14) },

      { mtsCreate: Date.UTC(2024, 0, 5, 9) }
    ].map((trx) => ({ trx }))
    const pubTradeChunkPayloads = getPubTradeChunkPayloads('BTC', trxData)

    assert.isArray(pubTradeChunkPayloads)
    assert.lengthOf(pubTradeChunkPayloads, 5)

    testPubTradeChunkPayloads(pubTradeChunkPayloads, 0, {
      symbol: 'BTC',
      end: Date.UTC(2024, 10, 11, 12),
      start: null
    })
    testPubTradeChunkPayloads(pubTradeChunkPayloads, 1, {
      symbol: 'BTC',
      end: Date.UTC(2024, 8, 15, 11),
      start: Date.UTC(2024, 8, 15, 10)
    })
    testPubTradeChunkPayloads(pubTradeChunkPayloads, 2, {
      symbol: 'BTC',
      end: Date.UTC(2024, 0, 9, 17),
      start: Date.UTC(2024, 0, 9, 16, 1)
    })
    testPubTradeChunkPayloads(pubTradeChunkPayloads, 3, {
      symbol: 'BTC',
      end: Date.UTC(2024, 0, 8, 16),
      start: Date.UTC(2024, 0, 8, 14)
    })
    testPubTradeChunkPayloads(pubTradeChunkPayloads, 4, {
      symbol: 'BTC',
      end: Date.UTC(2024, 0, 5, 9),
      start: null
    })
  })

  it('should not push separate request payload for trxs', function () {
    const trxData = [
      { mtsCreate: Date.UTC(2024, 1, 9, 1) },
      { mtsCreate: Date.UTC(2024, 1, 8, 16, 12, 15) },
      { mtsCreate: Date.UTC(2024, 1, 8, 16, 1) },
      { mtsCreate: Date.UTC(2024, 1, 8, 16) },
      { mtsCreate: Date.UTC(2024, 1, 8, 15) },
      { mtsCreate: Date.UTC(2024, 1, 8, 14) },
      { mtsCreate: Date.UTC(2024, 1, 8, 1) },
      { mtsCreate: Date.UTC(2024, 1, 7, 2) }
    ].map((trx) => ({ trx }))
    const pubTradeChunkPayloads = getPubTradeChunkPayloads('ETH', trxData)

    assert.isArray(pubTradeChunkPayloads)
    assert.lengthOf(pubTradeChunkPayloads, 1)

    testPubTradeChunkPayloads(pubTradeChunkPayloads, 0, {
      symbol: 'ETH',
      end: Date.UTC(2024, 1, 9, 1),
      start: Date.UTC(2024, 1, 7, 2)
    })
  })
})
