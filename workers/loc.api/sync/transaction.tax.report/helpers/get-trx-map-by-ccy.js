'use strict'

const {
  isForexSymb
} = require('../../helpers')

// Handle tETHF0:USTF0 symbols
const symbRegExpNormalizer = /F0$/i

module.exports = (trxs) => {
  const trxMapByCcy = new Map()

  for (const trx of trxs) {
    const firstSymb = trx.firstSymb.replace(symbRegExpNormalizer, '')
    const lastSymb = trx.lastSymb.replace(symbRegExpNormalizer, '')
    const isNotFirstSymbForex = !isForexSymb(trx.firstSymb)
    const isNotLastSymbForex = !isForexSymb(trx.lastSymb)

    if (isNotFirstSymbForex) {
      if (!trxMapByCcy.has(firstSymb)) {
        trxMapByCcy.set(firstSymb, [])
      }

      trxMapByCcy.get(firstSymb).push({
        isNotFirstSymbForex,
        isNotLastSymbForex,
        mainPricePropName: 'firstSymbPrice',
        secondPricePropName: 'lastSymbPrice',
        trx
      })
    }
    if (isNotLastSymbForex) {
      if (!trxMapByCcy.has(lastSymb)) {
        trxMapByCcy.set(lastSymb, [])
      }

      trxMapByCcy.get(lastSymb).push({
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
