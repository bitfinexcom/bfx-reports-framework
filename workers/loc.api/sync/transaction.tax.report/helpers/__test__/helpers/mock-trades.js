'use strict'

const mockTradesForNextYear = [
  {
    symbol: 'tUSTUSD',
    mtsCreate: Date.UTC(2024, 3, 27),
    execAmount: -200,
    execPrice: 0.98
  },
  {
    isAdditionalTrxMovements: true,
    symbol: 'tBTCUSD',
    mtsCreate: Date.UTC(2024, 3, 1),
    execAmount: -1,
    execPrice: 41_000
  },
  {
    symbol: 'tBTCUSD',
    mtsCreate: Date.UTC(2024, 2, 17),
    execAmount: -5,
    execPrice: 61_000
  },
  {
    isAdditionalTrxMovements: true,
    symbol: 'tBTCUSD',
    mtsCreate: Date.UTC(2024, 1, 8),
    execAmount: -3,
    execPrice: 44_000
  },
  {
    symbol: 'tBTCUSD',
    mtsCreate: Date.UTC(2024, 0, 14),
    execAmount: 2,
    execPrice: 48_000
  }
]
const mockTrades = [
  {
    isAdditionalTrxMovements: true,
    isTaxablePayment: true,
    isMarginFundingPayment: true,
    symbol: 'tEURUSD',
    mtsCreate: Date.UTC(2023, 6, 23),
    execAmount: 2.11,
    execPrice: 1.05,
    firstSymbPriceUsd: 1.05,
    lastSymbPriceUsd: 1
  },
  {
    symbol: 'tUSTEUR',
    mtsCreate: Date.UTC(2023, 6, 21),
    execAmount: -100,
    execPrice: 0.9,
    firstSymbPriceUsd: 1.05,
    lastSymbPriceUsd: 0.95
  },
  {
    symbol: 'tETHUST',
    mtsCreate: Date.UTC(2023, 5, 11),
    execAmount: -1,
    execPrice: 2800,
    firstSymbPriceUsd: 3_110,
    lastSymbPriceUsd: 1.11
  },
  {
    symbol: 'tETHBTC',
    mtsCreate: Date.UTC(2023, 4, 22),
    execAmount: -1,
    execPrice: 0.055,
    firstSymbPriceUsd: 2_650,
    lastSymbPriceUsd: 48_000
  },
  {
    symbol: 'tETHUSD',
    mtsCreate: Date.UTC(2023, 4, 10),
    execAmount: -1,
    execPrice: 2_000
  },
  {
    symbol: 'tETHUSD',
    mtsCreate: Date.UTC(2023, 3, 10),
    execAmount: -2,
    execPrice: 3_200
  },
  {
    isAdditionalTrxMovements: true,
    symbol: 'tETHUSD',
    mtsCreate: Date.UTC(2023, 3, 2),
    execAmount: -2,
    execPrice: 3000
  },
  {
    symbol: 'tETHBTC',
    mtsCreate: Date.UTC(2023, 2, 23),
    execAmount: 10,
    execPrice: 0.05,
    firstSymbPriceUsd: 2_601,
    lastSymbPriceUsd: 50_000
  },
  {
    symbol: 'tBTCUSD',
    mtsCreate: Date.UTC(2023, 2, 3),
    execAmount: -2,
    execPrice: 33_000
  },
  {
    isAdditionalTrxMovements: true,
    symbol: 'tBTCUSD',
    mtsCreate: Date.UTC(2023, 1, 5),
    execAmount: 20,
    execPrice: 43_000
  },
  {
    symbol: 'tBTCUSD',
    mtsCreate: Date.UTC(2023, 0, 10),
    execAmount: 3,
    execPrice: 20_000
  }
]

module.exports = {
  mockTradesForNextYear,
  mockTrades
}
