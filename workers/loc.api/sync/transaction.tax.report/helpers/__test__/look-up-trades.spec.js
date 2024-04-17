'use strict'

const { assert } = require('chai')

const lookUpTrades = require('../look-up-trades')
const {
  mockTradesForNextYear,
  mockTrades,
  getMockedTrades
} = require('./helpers')
const {
  testBuyTradesWithUnrealizedProfit,
  testSaleTradesWithRealizedProfit
} = require('./test-cases')

describe('lookUpTrades helper for trx tax report', () => {
  it('Lookup buy trx with unrealized profit, LIFO strategy', async function () {
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

    assert.isArray(buyTradesWithUnrealizedProfit)
    assert.equal(buyTradesWithUnrealizedProfit.length, 5)

    testBuyTradesWithUnrealizedProfit(buyTradesWithUnrealizedProfit, 0, {
      isMovements: false,
      mtsCreate: Date.UTC(2023, 5, 11),
      firstSymb: 'ETH',
      lastSymb: 'UST',
      execAmount: -1,
      execPrice: 2_800,
      buyFilledAmount: 100
    })
    testBuyTradesWithUnrealizedProfit(buyTradesWithUnrealizedProfit, 1, {
      isMovements: false,
      mtsCreate: Date.UTC(2023, 4, 22),
      firstSymb: 'ETH',
      lastSymb: 'BTC',
      execAmount: -1,
      execPrice: 0.055,
      buyFilledAmount: 0
    })
    testBuyTradesWithUnrealizedProfit(buyTradesWithUnrealizedProfit, 2, {
      isMovements: false,
      mtsCreate: Date.UTC(2023, 2, 23),
      firstSymb: 'ETH',
      lastSymb: 'BTC',
      execAmount: 10,
      execPrice: 0.05,
      buyFilledAmount: 7
    })
    testBuyTradesWithUnrealizedProfit(buyTradesWithUnrealizedProfit, 3, {
      isMovements: true,
      mtsCreate: Date.UTC(2023, 1, 5),
      firstSymb: 'BTC',
      lastSymb: 'USD',
      execAmount: 20,
      execPrice: 43_000,
      buyFilledAmount: 2.5
    })
    testBuyTradesWithUnrealizedProfit(buyTradesWithUnrealizedProfit, 4, {
      isMovements: false,
      mtsCreate: Date.UTC(2023, 0, 10),
      firstSymb: 'BTC',
      lastSymb: 'USD',
      execAmount: 3,
      execPrice: 20_000,
      buyFilledAmount: 0
    })
  })

  it('Lookup sale trx with realized profit, LIFO strategy', async function () {
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

    assert.isArray(saleTradesWithRealizedProfit)
    assert.equal(saleTradesWithRealizedProfit.length, 7)

    testSaleTradesWithRealizedProfit(saleTradesWithRealizedProfit, 0, {
      asset: 'UST',
      amount: 100,
      mtsAcquired: Date.UTC(2023, 5, 11),
      mtsSold: Date.UTC(2023, 6, 21),
      proceeds: 105,
      cost: 111,
      gainOrLoss: -6
    })
    testSaleTradesWithRealizedProfit(saleTradesWithRealizedProfit, 1, {
      asset: 'ETH',
      amount: 1,
      mtsAcquired: Date.UTC(2023, 2, 23),
      mtsSold: Date.UTC(2023, 5, 11),
      proceeds: 3110,
      cost: 2601,
      gainOrLoss: 509
    })
    testSaleTradesWithRealizedProfit(saleTradesWithRealizedProfit, 2, {
      asset: 'ETH',
      amount: 1,
      mtsAcquired: Date.UTC(2023, 2, 23),
      mtsSold: Date.UTC(2023, 4, 22),
      proceeds: 2650,
      cost: 2601,
      gainOrLoss: 49
    })
    testSaleTradesWithRealizedProfit(saleTradesWithRealizedProfit, 3, {
      asset: 'ETH',
      amount: 1,
      mtsAcquired: Date.UTC(2023, 2, 23),
      mtsSold: Date.UTC(2023, 4, 10),
      proceeds: 2000,
      cost: 2601,
      gainOrLoss: -601
    })
    testSaleTradesWithRealizedProfit(saleTradesWithRealizedProfit, 4, {
      asset: 'ETH',
      amount: 2,
      mtsAcquired: Date.UTC(2023, 2, 23),
      mtsSold: Date.UTC(2023, 3, 10),
      proceeds: 6400,
      cost: 5202,
      gainOrLoss: 1198
    })
    testSaleTradesWithRealizedProfit(saleTradesWithRealizedProfit, 5, {
      asset: 'BTC',
      amount: 0.5,
      mtsAcquired: Date.UTC(2023, 1, 5),
      mtsSold: Date.UTC(2023, 2, 23),
      proceeds: 25000,
      cost: 21500,
      gainOrLoss: 3500
    })
    testSaleTradesWithRealizedProfit(saleTradesWithRealizedProfit, 6, {
      asset: 'BTC',
      amount: 2,
      mtsAcquired: Date.UTC(2023, 1, 5),
      mtsSold: Date.UTC(2023, 2, 3),
      proceeds: 66000,
      cost: 86000,
      gainOrLoss: -20000
    })
  })

  it('Lookup buy trx with unrealized profit, FIFO strategy', async function () {
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

    assert.isArray(buyTradesWithUnrealizedProfit)
    assert.equal(buyTradesWithUnrealizedProfit.length, 5)

    testBuyTradesWithUnrealizedProfit(buyTradesWithUnrealizedProfit, 0, {
      isMovements: false,
      mtsCreate: Date.UTC(2023, 5, 11),
      firstSymb: 'ETH',
      lastSymb: 'UST',
      execAmount: -1,
      execPrice: 2_800,
      buyFilledAmount: 100
    })
    testBuyTradesWithUnrealizedProfit(buyTradesWithUnrealizedProfit, 1, {
      isMovements: false,
      mtsCreate: Date.UTC(2023, 4, 22),
      firstSymb: 'ETH',
      lastSymb: 'BTC',
      execAmount: -1,
      execPrice: 0.055,
      buyFilledAmount: 0
    })
    testBuyTradesWithUnrealizedProfit(buyTradesWithUnrealizedProfit, 2, {
      isMovements: false,
      mtsCreate: Date.UTC(2023, 2, 23),
      firstSymb: 'ETH',
      lastSymb: 'BTC',
      execAmount: 10,
      execPrice: 0.05,
      buyFilledAmount: 7
    })
    testBuyTradesWithUnrealizedProfit(buyTradesWithUnrealizedProfit, 3, {
      isMovements: true,
      mtsCreate: Date.UTC(2023, 1, 5),
      firstSymb: 'BTC',
      lastSymb: 'USD',
      execAmount: 20,
      execPrice: 43_000,
      buyFilledAmount: 0
    })
    testBuyTradesWithUnrealizedProfit(buyTradesWithUnrealizedProfit, 4, {
      isMovements: false,
      mtsCreate: Date.UTC(2023, 0, 10),
      firstSymb: 'BTC',
      lastSymb: 'USD',
      execAmount: 3,
      execPrice: 20_000,
      buyFilledAmount: 2.5
    })
  })

  it('Lookup sale trx with realized profit, FIFO strategy', async function () {
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

    assert.isArray(saleTradesWithRealizedProfit)
    assert.equal(saleTradesWithRealizedProfit.length, 7)

    testSaleTradesWithRealizedProfit(saleTradesWithRealizedProfit, 0, {
      asset: 'UST',
      amount: 100,
      mtsAcquired: Date.UTC(2023, 5, 11),
      mtsSold: Date.UTC(2023, 6, 21),
      proceeds: 105,
      cost: 111,
      gainOrLoss: -6
    })
    testSaleTradesWithRealizedProfit(saleTradesWithRealizedProfit, 1, {
      asset: 'ETH',
      amount: 1,
      mtsAcquired: Date.UTC(2023, 2, 23),
      mtsSold: Date.UTC(2023, 5, 11),
      proceeds: 3110,
      cost: 2601,
      gainOrLoss: 509
    })
    testSaleTradesWithRealizedProfit(saleTradesWithRealizedProfit, 2, {
      asset: 'ETH',
      amount: 1,
      mtsAcquired: Date.UTC(2023, 2, 23),
      mtsSold: Date.UTC(2023, 4, 22),
      proceeds: 2650,
      cost: 2601,
      gainOrLoss: 49
    })
    testSaleTradesWithRealizedProfit(saleTradesWithRealizedProfit, 3, {
      asset: 'ETH',
      amount: 1,
      mtsAcquired: Date.UTC(2023, 2, 23),
      mtsSold: Date.UTC(2023, 4, 10),
      proceeds: 2000,
      cost: 2601,
      gainOrLoss: -601
    })
    testSaleTradesWithRealizedProfit(saleTradesWithRealizedProfit, 4, {
      asset: 'ETH',
      amount: 2,
      mtsAcquired: Date.UTC(2023, 2, 23),
      mtsSold: Date.UTC(2023, 3, 10),
      proceeds: 6400,
      cost: 5202,
      gainOrLoss: 1198
    })
    testSaleTradesWithRealizedProfit(saleTradesWithRealizedProfit, 5, {
      asset: 'BTC',
      amount: 0.5,
      mtsAcquired: Date.UTC(2023, 0, 10),
      mtsSold: Date.UTC(2023, 2, 23),
      proceeds: 25000,
      cost: 10000,
      gainOrLoss: 15000
    })
    testSaleTradesWithRealizedProfit(saleTradesWithRealizedProfit, 6, {
      asset: 'BTC',
      amount: 2,
      mtsAcquired: Date.UTC(2023, 0, 10),
      mtsSold: Date.UTC(2023, 2, 3),
      proceeds: 66000,
      cost: 40000,
      gainOrLoss: 26000
    })
  })

  it('Lookup sale trx with realized profit considering prev year, LIFO strategy', async function () {
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
