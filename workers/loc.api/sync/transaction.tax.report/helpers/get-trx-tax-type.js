'use strict'

const TRX_TAX_TYPES = require('./trx.tax.types')

module.exports = (trx) => {
  if (trx?.isAirdropOnWallet) {
    return TRX_TAX_TYPES.AIRDROP_ON_WALLET
  }
  if (trx?.isMarginFundingPayment) {
    return TRX_TAX_TYPES.MARGIN_FUNDING_PAYMENT
  }
  if (trx?.isAffiliateRebate) {
    return TRX_TAX_TYPES.AFFILIATE_REBATE
  }
  if (trx?.isStakingPayments) {
    return TRX_TAX_TYPES.STAKING_PAYMENT
  }
  if (trx?.isMarginTrading) {
    return TRX_TAX_TYPES.MARGIN_TRADING
  }
  if (trx?.isDerivative) {
    return TRX_TAX_TYPES.DERIVATIVE
  }

  return TRX_TAX_TYPES.EXCHANGE
}
