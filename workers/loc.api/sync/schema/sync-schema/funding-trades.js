'use strict'

const Model = require('./model')

module.exports = new Model({
  [Model.NAME]: Model.ALLOWED_COLLS.FUNDING_TRADES,
  [Model.MAX_LIMIT]: 1_000,
  [Model.DATE_FIELD_NAME]: 'mtsCreate',
  [Model.SYMBOL_FIELD_NAME]: 'symbol',
  [Model.ORDER]: [['mtsCreate', Model.ORDERS.DESC]],
  [Model.IS_SYNC_REQUIRED_AT_LEAST_ONCE]: false,
  [Model.TYPE]: Model.ALLOWED_COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS
})
