'use strict'

const {
  getMtsGroupedByTimeframe,
  calcGroupedData
} = require('../helpers')

// TODO: need to convert crypto to USD
const _getWalletsByTimeframe = (rService, args) => {
  return async ({ mtsGroupedByTimeframe } = {}) => {
    const { mts: end } = mtsGroupedByTimeframe
    const wallets = await rService.getWallets(null, {
      auth: { ...args.auth },
      params: { end }
    })
    const res = wallets.reduce((accum, { currency, balance }) => {
      return {
        ...accum,
        [currency]: (
          Number.isFinite(accum[currency]) &&
          Number.isFinite(balance)
        )
          ? accum[currency] + balance
          : balance
      }
    }, {})

    return res
  }
}

module.exports = async (
  rService,
  {
    auth = {},
    params: {
      timeframe = 'day',
      start = 0,
      end = Date.now()
    } = {}
  } = {}
) => {
  const args = {
    auth,
    params: {
      symbol: ['EUR', 'JPY', 'GBP', 'USD'],
      timeframe
    }
  }

  const mtsGroupedByTimeframe = getMtsGroupedByTimeframe(
    start,
    end,
    timeframe
  )

  const res = await calcGroupedData(
    {
      mtsGroupedByTimeframe
    },
    false,
    _getWalletsByTimeframe(rService, args)
  )

  return res
}
