'use strict'

const getTrades = require('./get-trades')
const getMarginTrades = require('./get-margin-trades')
const getFundingPayment = require('./get-funding-payment')
const getMovementFees = require('./get-movement-fees')
const { calcGroupedData } = require('./helpers')

const _getData = async (dao, args) => {
  const { skip } = { ...args.params }
  const map = {
    trades: getTrades,
    marginTrades: getMarginTrades,
    fundingPayment: getFundingPayment,
    movementFees: getMovementFees
  }
  const res = {}

  for (const [key, getter] of Object.entries(map)) {
    if (
      Array.isArray(skip) &&
      skip.some(item => item === key)
    ) {
      continue
    }

    res[key] = await getter(dao, args)
  }

  return res
}

module.exports = async (
  dao,
  {
    auth = {},
    params: {
      timeframe = 'day',
      start = 0,
      end = Date.now(),
      skip = []
    } = {}
  } = {}
) => {
  const user = await dao.checkAuthInDb({ auth })
  const args = {
    auth: user,
    params: {
      symbol: ['EUR', 'JPY', 'GBP', 'USD'],
      timeframe,
      start,
      end,
      skip
    }
  }
  const data = await _getData(dao, args)
  const res = calcGroupedData(data)

  return res
}
