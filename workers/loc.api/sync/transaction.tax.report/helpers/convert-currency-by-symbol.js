'use strict'

module.exports = (trxData, pubTrades) => {
  for (const trxDataItem of trxData) {
    let lastIndex = 0

    for (let i = lastIndex; pubTrades.length > i; i += 1) {
      const pubTrade = pubTrades[i]
      const isLastPubTrade = (i + 1) === pubTrades.length

      if (
        (
          pubTrade?.mts > trxDataItem.trx.mtsCreate &&
          !isLastPubTrade
        ) ||
        !Number.isFinite(pubTrade?.price) ||
        pubTrade.price === 0
      ) {
        continue
      }

      lastIndex = i
      trxDataItem.trx[trxDataItem.mainPricePropName] = pubTrade.price

      if (trxDataItem.trx.isMovements) {
        trxDataItem.trx.execPrice = pubTrade.price

        break
      }
      if (
        !Number.isFinite(trxDataItem.trx.execPrice) ||
        trxDataItem.trx.execPrice === 0
      ) {
        break
      }
      if (
        trxDataItem.isNotFirstSymbForex &&
        !trxDataItem.isNotLastSymbForex
      ) {
        trxDataItem.trx[trxDataItem.secondPricePropName] = (
          pubTrade.price / trxDataItem.trx.execPrice
        )
      }
      if (
        !trxDataItem.isNotFirstSymbForex &&
        trxDataItem.isNotLastSymbForex
      ) {
        trxDataItem.trx[trxDataItem.secondPricePropName] = (
          pubTrade.price * trxDataItem.trx.execPrice
        )
      }

      break
    }
  }
}
