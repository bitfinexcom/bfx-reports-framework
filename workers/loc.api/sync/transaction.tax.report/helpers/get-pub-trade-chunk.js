'use strict'

const {
  TrxTaxReportGenerationTimeoutError
} = require('../../../errors')

module.exports = async (params, pubTradeGetter) => {
  const symbol = params?.symbol
  const start = params?.start
  let end = params?.end
  let timeoutMts = Date.now()
  const res = []

  while (true) {
    const currMts = Date.now()
    const mtsDiff = currMts - timeoutMts

    if (mtsDiff > 1000 * 60 * 60 * 12) {
      throw new TrxTaxReportGenerationTimeoutError()
    }

    timeoutMts = currMts

    const { res: pubTrades } = await pubTradeGetter({
      symbol: `t${symbol}USD`,
      start: 0,
      end
    })

    if (!Array.isArray(pubTrades)) {
      break
    }
    if (
      pubTrades.length === 0 ||
      !Number.isFinite(start) ||
      !Number.isFinite(pubTrades[0]?.mts) ||
      !Number.isFinite(pubTrades[pubTrades.length - 1]?.mts) ||
      (
        res.length !== 0 &&
        pubTrades[0]?.mts >= res[res.length - 1]?.mts
      ) ||
      pubTrades[pubTrades.length - 1]?.mts <= start
    ) {
      res.push(...pubTrades)

      break
    }

    end = pubTrades[pubTrades.length - 1].mts - 1
    res.push(...pubTrades)
  }

  return res
}
