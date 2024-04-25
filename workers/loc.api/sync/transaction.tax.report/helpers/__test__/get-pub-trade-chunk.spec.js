'use strict'

const { assert } = require('chai')

const getPubTradeChunk = require('../get-pub-trade-chunk')

const {
  getMockedPubTrades
} = require('./helpers')

describe('getPubTradeChunk helper for trx tax report', () => {
  it('should get pub trades for required start and end', async function () {
    const params = {
      symbol: 'BTC',
      start: Date.UTC(2024, 0, 1),
      end: Date.UTC(2024, 11, 31)
    }

    let nextRequiredEndPoint = params.end
    let callAmount = 0
    const requiredCallAmount = 3
    const diff = params.end - params.start
    const step = diff / requiredCallAmount

    const pubTrades = await getPubTradeChunk(params, (args) => {
      callAmount += 1

      assert.isString(args.symbol)
      assert.equal(args.symbol, 'tBTCUSD')
      assert.isNumber(args.start)
      assert.equal(args.start, 0)
      assert.isNumber(args.end)
      assert.equal(args.end, nextRequiredEndPoint)

      const res = getMockedPubTrades({
        lenght: 100,
        end: args.end,
        start: callAmount < requiredCallAmount
          ? Math.trunc(args.end - step)
          : params.start,
        price: 51_000
      })

      nextRequiredEndPoint = res[res.length - 1].mts - 1

      return { res }
    })

    assert.isArray(pubTrades)
    assert.lengthOf(pubTrades, 300)

    for (const pubTrade of pubTrades) {
      assert.isObject(pubTrade)
      assert.isNumber(pubTrade.mts)
      assert.isNumber(pubTrade.price)
      assert.equal(pubTrade.price, 51_000)
    }

    assert.equal(pubTrades[0].mts, params.end)
    assert.equal(pubTrades[pubTrades.length - 1].mts, params.start)
  })

  it('should get pub trades for required start and end with empty array in last response', async function () {
    const params = {
      symbol: 'ETH',
      start: Date.UTC(2024, 1, 5),
      end: Date.UTC(2024, 10, 25)
    }

    let nextRequiredEndPoint = params.end
    let callAmount = 0
    const requiredCallAmount = 5
    const diff = params.end - params.start
    const step = diff / requiredCallAmount

    const pubTrades = await getPubTradeChunk(params, (args) => {
      callAmount += 1

      assert.isString(args.symbol)
      assert.equal(args.symbol, 'tETHUSD')
      assert.isNumber(args.start)
      assert.equal(args.start, 0)
      assert.isNumber(args.end)
      assert.equal(args.end, nextRequiredEndPoint)

      if (callAmount === requiredCallAmount) {
        return { res: [] }
      }

      const res = getMockedPubTrades({
        lenght: 10_000,
        end: args.end,
        start: callAmount < requiredCallAmount
          ? Math.trunc(args.end - step)
          : params.start,
        price: 33_000
      })

      nextRequiredEndPoint = res[res.length - 1].mts - 1

      return { res }
    })

    assert.isArray(pubTrades)
    assert.lengthOf(pubTrades, 40_000)

    for (const pubTrade of pubTrades) {
      assert.isObject(pubTrade)
      assert.isNumber(pubTrade.mts)
      assert.isNumber(pubTrade.price)
      assert.equal(pubTrade.price, 33_000)
    }

    assert.equal(pubTrades[0].mts, params.end)
    assert.equal(pubTrades[pubTrades.length - 1].mts, nextRequiredEndPoint + 1)
  })
})
