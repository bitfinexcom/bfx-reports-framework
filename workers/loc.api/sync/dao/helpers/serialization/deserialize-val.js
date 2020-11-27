'use strict'

const {
  tryParseJSON
} = require('../../../../helpers/utils')

module.exports = (
  val,
  key,
  boolFields = [
    'notify',
    'hidden',
    'renew',
    'noClose',
    'maker',
    '_isMarginFundingPayment',
    '_isAffiliateRebate',
    '_isStakingPayments'
  ]
) => {
  if (
    typeof val === 'number' &&
    boolFields.some(item => item === key)
  ) {
    return !!val
  }
  if (
    typeof val === 'string' &&
    key === 'rate'
  ) {
    const _val = parseFloat(val)

    return isFinite(_val) ? _val : val
  }
  if (tryParseJSON(val)) {
    return tryParseJSON(val)
  }

  return val
}
