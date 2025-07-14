'use strict'

const Model = require('./model')

module.exports = new Model({
  [Model.NAME]: Model.ALLOWED_COLLS.LEDGERS,
  [Model.DATE_FIELD_NAME]: 'mts',
  [Model.SYMBOL_FIELD_NAME]: 'currency',
  [Model.ORDER]: [['mts', Model.ORDERS.DESC], ['id', Model.ORDERS.DESC]],
  [Model.SQL_GROUP_FNS]: ['max(mts)', 'max(id)'],
  [Model.SQL_GROUP_RES_BY]: ['wallet', 'currency'],
  [Model.IS_SYNC_REQUIRED_AT_LEAST_ONCE]: true,
  [Model.TYPE]: Model.ALLOWED_COLLS_TYPES.HIDDEN_INSERTABLE_ARRAY_OBJECTS,
  [Model.DATA_STRUCTURE_CONVERTER]: (accum, {
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
})
