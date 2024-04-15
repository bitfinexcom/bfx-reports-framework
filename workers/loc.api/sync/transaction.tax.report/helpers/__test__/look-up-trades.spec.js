'use strict'

const { assert } = require('chai')

const lookUpTrades = require('../look-up-trades')
const {
  mockTradesForNextYear,
  mockTrades,
  getMockedTrades
} = require('./helpers')

describe('lookUpTrades helper for trx tax report', () => {
  it('Lookup buy trx with unrealized profit, LIFO strategy', async function () {
    this.timeout(1000)

    const {
      buyTradesWithUnrealizedProfit
    } = await lookUpTrades(
      getMockedTrades(mockTrades),
      {
        isBackIterativeSaleLookUp: false,
        isBackIterativeBuyLookUp: false,
        isBuyTradesWithUnrealizedProfitRequired: true,
        isNotGainOrLossRequired: true
      }
    )

    console.log('[buyTradesWithUnrealizedProfit]:', buyTradesWithUnrealizedProfit)
  })

  it('Lookup sale trx with realized profit, LIFO strategy', async function () {
    this.timeout(1000)

    const {
      saleTradesWithRealizedProfit
    } = await lookUpTrades(
      getMockedTrades(mockTrades),
      {
        isBackIterativeSaleLookUp: false,
        isBackIterativeBuyLookUp: false,
        isBuyTradesWithUnrealizedProfitRequired: false,
        isNotGainOrLossRequired: false
      }
    )

    console.log('[saleTradesWithRealizedProfit]:', saleTradesWithRealizedProfit)
  })
  it('Lookup buy trx with unrealized profit, FIFO strategy', async function () {
    this.timeout(1000)

    const {
      buyTradesWithUnrealizedProfit
    } = await lookUpTrades(
      getMockedTrades(mockTrades),
      {
        isBackIterativeSaleLookUp: true,
        isBackIterativeBuyLookUp: true,
        isBuyTradesWithUnrealizedProfitRequired: true,
        isNotGainOrLossRequired: true
      }
    )

    console.log('[buyTradesWithUnrealizedProfit]:', buyTradesWithUnrealizedProfit)
  })

  it('Lookup sale trx with realized profit, FIFO strategy', async function () {
    this.timeout(1000)

    const {
      saleTradesWithRealizedProfit
    } = await lookUpTrades(
      getMockedTrades(mockTrades),
      {
        isBackIterativeSaleLookUp: true,
        isBackIterativeBuyLookUp: true,
        isBuyTradesWithUnrealizedProfitRequired: false,
        isNotGainOrLossRequired: false
      }
    )

    console.log('[saleTradesWithRealizedProfit]:', saleTradesWithRealizedProfit)
  })

  it('Lookup sale trx with realized profit considering prev year, LIFO strategy', async function () {
    this.timeout(1000)

    const {
      buyTradesWithUnrealizedProfit
    } = await lookUpTrades(
      getMockedTrades(mockTrades),
      {
        isBackIterativeSaleLookUp: false,
        isBackIterativeBuyLookUp: false,
        isBuyTradesWithUnrealizedProfitRequired: true,
        isNotGainOrLossRequired: true
      }
    )
    console.log('[buyTradesWithUnrealizedProfit]:', buyTradesWithUnrealizedProfit)
    const _mockTradesForNextYear = getMockedTrades(mockTradesForNextYear)
    _mockTradesForNextYear.push(...buyTradesWithUnrealizedProfit)

    const {
      saleTradesWithRealizedProfit
    } = await lookUpTrades(
      _mockTradesForNextYear,
      {
        isBackIterativeSaleLookUp: false,
        isBackIterativeBuyLookUp: false,
        isBuyTradesWithUnrealizedProfitRequired: false,
        isNotGainOrLossRequired: false
      }
    )

    console.log('[saleTradesWithRealizedProfit]:', saleTradesWithRealizedProfit)
  })
})
