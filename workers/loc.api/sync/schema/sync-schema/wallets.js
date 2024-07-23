'use strict'

const TABLES_NAMES = require('../tables-names')
const ALLOWED_COLLS = require('../allowed.colls')
const COLLS_TYPES = require('../colls.types')

const { getModelOf } = require('../models')

module.exports = {
  name: ALLOWED_COLLS.LEDGERS,
  dateFieldName: 'mts',
  symbolFieldName: 'currency',
  sort: [['mts', -1]],
  groupFns: ['max(mts)', 'max(id)'],
  groupResBy: ['wallet', 'currency'],
  isSyncRequiredAtLeastOnce: true,
  type: COLLS_TYPES.HIDDEN_INSERTABLE_ARRAY_OBJECTS,
  model: getModelOf(TABLES_NAMES.LEDGERS),
  dataStructureConverter: (accum, {
    wallet: type,
    currency,
    balance,
    mts: mtsUpdate
  } = {}) => {
    accum.push({
      type,
      currency,
      balance,
      unsettledInterest: null,
      balanceAvailable: null,
      placeHolder: null,
      mtsUpdate
    })

    return accum
  }
}
