'use strict'

const TABLES_NAMES = require('../../schema/tables-names')

module.exports = (
  methodColl,
  args
) => {
  if (methodColl.getModelField('NAME') !== TABLES_NAMES.LEDGERS) {
    return {}
  }

  const { auth, params } = args ?? {}
  const filter = {}

  if (auth?.isSubAccount) {
    filter._isBalanceRecalced = 1
  }
  if (params?.wallet) {
    filter.wallet = params.wallet
  }
  if (params?.category) {
    filter._category = params.category
  }

  return filter
}
