'use strict'

const {
  calcGroupedData
} = require('../helpers')
const getBalanceHistory = require('../get-balance-history')

// TODO: need to implement calc of DEPOSIT/WITHDRAWALS
const _getWinLossByTimeframe = (
  symbol = [],
  startWalletsVals = {}
) => {
  return ({ walletsGroupedByTimeframe } = {}) => {
    return symbol.reduce((accum, symb) => {
      const startWallet = Number.isFinite(startWalletsVals[symb])
        ? startWalletsVals[symb]
        : 0
      const wallet = Number.isFinite(walletsGroupedByTimeframe[symb])
        ? walletsGroupedByTimeframe[symb]
        : 0
      const res = wallet - startWallet

      return {
        ...accum,
        [symb]: res
      }
    }, {})
  }
}

module.exports = async (
  { dao },
  {
    auth = {},
    params: {
      timeframe = 'day',
      start = 0,
      end = Date.now()
    } = {}
  } = {}
) => {
  const symbol = ['EUR', 'JPY', 'GBP', 'USD']
  const args = {
    auth,
    params: {
      timeframe,
      start,
      end
    }
  }

  const walletsGroupedByTimeframe = await getBalanceHistory(
    { dao },
    args,
    true,
    symbol
  )

  const startWalletsInForex = {
    ...({
      ...walletsGroupedByTimeframe[walletsGroupedByTimeframe.length - 1]
    }).vals
  }

  const res = await calcGroupedData(
    {
      walletsGroupedByTimeframe
    },
    false,
    _getWinLossByTimeframe(symbol, startWalletsInForex),
    true
  )

  return res
}
