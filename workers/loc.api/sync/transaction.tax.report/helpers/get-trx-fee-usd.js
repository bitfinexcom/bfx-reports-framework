'use strict'

const BigNumber = require('bignumber.js')

module.exports = (trx, opts) => {
  if (
    opts?.isNotGainOrLossRequired ||
    !opts?.shouldFeesBeDeducted ||
    trx.isTaxablePayment ||
    !Number.isFinite(trx.trxFee)
  ) {
    return new BigNumber(0)
  }
  if (
    trx.trxFeeCcy === trx.firstSymb &&
    Number.isFinite(trx.firstSymbPriceUsd)
  ) {
    return new BigNumber(trx.trxFee)
      .times(trx.firstSymbPriceUsd)
  }
  if (
    trx.trxFeeCcy === trx.lastSymb &&
    Number.isFinite(trx.lastSymbPriceUsd)
  ) {
    return new BigNumber(trx.trxFee)
      .times(trx.lastSymbPriceUsd)
  }

  return new BigNumber(0)
}
