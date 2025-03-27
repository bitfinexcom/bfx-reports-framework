'use strict'

const BigNumber = require('bignumber.js')

const {
  isForexSymb
} = require('../../helpers')

module.exports = (movements, params) => {
  const {
    remappedExchangeTrxs,
    remappedTrxsForConvToUsd
  } = params

  for (const movement of movements) {
    const isTaxablePayment = !!(
      movement?._isAirdropOnWallet ||
      movement?._isMarginFundingPayment ||
      movement?._isAffiliateRebate ||
      movement?._isStakingPayments
    )

    if (
      !movement?.currency ||
      (
        !isTaxablePayment &&
        isForexSymb(movement.currency)
      ) ||
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
      // NOTE: it means entries are not taken from trades table
      isAdditionalTrxMovements: true,
      // NOTE: movements can have sub-account transfer entries from ledgers table
      isMovements: !movement.isLedgers,
      isLedgers: !!movement.isLedgers,
      isTrades: false,
      isTaxablePayment,
      symbol: `t${firstSymb}${symbSeparator}${lastSymb}`,
      mtsCreate: movement.mtsUpdated,
      firstSymb,
      lastSymb,
      firstSymbPriceUsd: null,
      lastSymbPriceUsd: 1,
      execAmount: movement.amount,
      // NOTE: execPrice = firstSymbPriceUsd and should be set when converting currencies
      execPrice: 0,
      // NOTE: exactUsdValue can be null on the first launch, for warm-up it's filling from pub-trades
      exactUsdValue: movement.exactUsdValue,

      isAirdropOnWallet: !!movement?._isAirdropOnWallet,
      isMarginFundingPayment: !!movement?._isMarginFundingPayment,
      isAffiliateRebate: !!movement?._isAffiliateRebate,
      isStakingPayments: !!movement?._isStakingPayments
    }

    remappedExchangeTrxs.push(remappedMovement)

    if (
      isTaxablePayment &&
      firstSymb === 'USD'
    ) {
      remappedMovement.firstSymbPriceUsd = 1
      remappedMovement.execPrice = 1

      continue
    }
    if (
      Number.isFinite(movement.exactUsdValue) &&
      movement.exactUsdValue !== 0
    ) {
      const price = new BigNumber(movement.exactUsdValue)
        .div(movement.amount)
        .abs()
        .toNumber()

      remappedMovement.firstSymbPriceUsd = price
      remappedMovement.execPrice = price

      continue
    }

    remappedTrxsForConvToUsd.push(remappedMovement)
  }

  return params
}
