'use strict'

module.exports = (symbol, trxData) => {
  const pubTradeChunkPayloads = []

  for (const { trx } of trxData) {
    const lastPayloads = pubTradeChunkPayloads[pubTradeChunkPayloads.length - 1]
    const lastMts = lastPayloads?.start ?? lastPayloads?.end
    const currMts = trx.mtsCreate

    if (!lastPayloads?.end) {
      pubTradeChunkPayloads.push({
        symbol,
        end: currMts,
        start: null
      })

      continue
    }

    const mtsDiff = lastMts - currMts
    const maxAllowedTimeframe = 1000 * 60 * 60 * 24

    if (mtsDiff < maxAllowedTimeframe) {
      lastPayloads.start = currMts

      continue
    }

    pubTradeChunkPayloads.push({
      symbol,
      end: currMts,
      start: null
    })
  }

  return pubTradeChunkPayloads
}
