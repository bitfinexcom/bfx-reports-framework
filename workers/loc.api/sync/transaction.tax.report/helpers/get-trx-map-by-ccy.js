'use strict'

const {
  isForexSymb
} = require('../../helpers')

module.exports = (trxs) => {
  const trxMapByCcy = new Map()

  for (const trx of trxs) {
    const isNotFirstSymbForex = !isForexSymb(trx.firstSymb)
    const isNotLastSymbForex = !isForexSymb(trx.lastSymb)

    if (isNotFirstSymbForex) {
      if (!trxMapByCcy.has(trx.firstSymb)) {
        trxMapByCcy.set(trx.firstSymb, [])
      }

      trxMapByCcy.get(trx.firstSymb).push({
        isNotFirstSymbForex,
        isNotLastSymbForex,
        mainPricePropName: 'firstSymbPrice',
        secondPricePropName: 'lastSymbPrice',
        trx
      })
    }
    if (isNotLastSymbForex) {
      if (!trxMapByCcy.has(trx.lastSymb)) {
        trxMapByCcy.set(trx.lastSymb, [])
      }

      trxMapByCcy.get(trx.lastSymb).push({
        isNotFirstSymbForex,
        isNotLastSymbForex,
        mainPricePropName: 'lastSymbPrice',
        secondPricePropName: 'firstSymbPrice',
        trx
      })
    }
  }

  return trxMapByCcy
}
