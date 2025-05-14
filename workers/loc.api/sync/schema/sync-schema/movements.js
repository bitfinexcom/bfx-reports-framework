'use strict'

const Model = require('./model')

module.exports = new Model({
  [Model.NAME]: Model.ALLOWED_COLLS.MOVEMENTS,
  [Model.MAX_LIMIT]: 250,
  [Model.DATE_FIELD_NAME]: 'mtsUpdated',
  [Model.SYMBOL_FIELD_NAME]: 'currency',
  [Model.ORDER]: [['mtsUpdated', Model.ORDERS.DESC]],
  [Model.IS_SYNC_REQUIRED_AT_LEAST_ONCE]: true,
  [Model.TYPE]: Model.ALLOWED_COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS
})
