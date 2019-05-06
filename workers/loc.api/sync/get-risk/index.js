'use strict'

const getTrades = require('./get-trades')
const getMarginTrades = require('./get-margin-trades')
const getFundingPayment = require('./get-funding-payment')
const getMovementFees = require('./get-movement-fees')
const { calcGroupedData } = require('../helpers')

const _getData = async (rService, args) => {
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

    res[key] = await getter(rService, args)
  }

  return res
}

module.exports = async (
  rService,
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
  const user = await rService.dao.checkAuthInDb({ auth })
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
  const data = await _getData(rService, args)
  const res = await calcGroupedData(data)

  return res
}
