'use strict'

const {
  isForexSymb
} = require('../../helpers')

module.exports = (movements, params) => {
  const {
    remapedTrxs,
    remapedTrxsForConvToUsd
  } = params

  for (const movement of movements) {
    if (
      !movement?.currency ||
      isForexSymb(movement.currency) ||
      !Number.isFinite(movement?.amount) ||
      movement.amount === 0 ||
      !Number.isFinite(movement?.mtsUpdated)
    ) {
      continue
    }

    const firstSymb = movement.currency
    const lastSymb = 'USD'
    const symbSeparator = firstSymb.length > 3
      ? ':'
      : ''

    const remapedMovement = {
      isMovements: true,
      symbol: `t${firstSymb}${symbSeparator}${lastSymb}`,
      mtsCreate: movement.mtsUpdated,
      firstSymb,
      lastSymb,
      firstSymbPrice: null,
      lastSymbPrice: 1,
      execAmount: movement.amount,
      // NOTE: execPrice = firstSymbPrice and should be set when converting currencies
      execPrice: 0
    }

    remapedTrxs.push(remapedMovement)
    remapedTrxsForConvToUsd.push(remapedMovement)
  }

  return params
}
