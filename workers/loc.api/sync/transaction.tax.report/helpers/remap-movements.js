'use strict'

const {
  isForexSymb
} = require('../../helpers')

module.exports = (movements, params) => {
  const {
    remappedTrxs,
    remappedTrxsForConvToUsd
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

    const remappedMovement = {
      _id: movement._id,
      // NOTE: it means entries are not taken form trades table
      isAdditionalTrxMovements: true,
      // NOTE: movements can have sub-account transfer entries from ledgers table
      isMovements: !movement.isLedgers,
      isLedgers: !!movement.isLedgers,
      isTrades: false,
      symbol: `t${firstSymb}${symbSeparator}${lastSymb}`,
      mtsCreate: movement.mtsUpdated,
      firstSymb,
      lastSymb,
      firstSymbPrice: null,
      lastSymbPrice: 1,
      execAmount: movement.amount,
      // NOTE: execPrice = firstSymbPrice and should be set when converting currencies
      execPrice: 0,
      // NOTE: exactUsdValue can be null on the first launch, for warm-up it's filling from pub-trades
      exactUsdValue: movement.exactUsdValue
    }

    remappedTrxs.push(remappedMovement)

    if (
      Number.isFinite(movement.exactUsdValue) &&
      movement.exactUsdValue > 0
    ) {
      const price = movement.exactUsdValue / movement.amount

      remappedMovement.firstSymbPrice = price
      remappedMovement.execPrice = price

      continue
    }

    remappedTrxsForConvToUsd.push(remappedMovement)
  }

  return params
}
