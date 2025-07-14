'use strict'

const Model = require('./model')

module.exports = new Model({
  [Model.NAME]: Model.ALLOWED_COLLS.POSITIONS_HISTORY,
  [Model.MAX_LIMIT]: 10_000,
  [Model.DATE_FIELD_NAME]: 'mtsUpdate',
  [Model.SYMBOL_FIELD_NAME]: 'symbol',
  [Model.ORDER]: [['mtsUpdate', Model.ORDERS.DESC]],
  [Model.IS_SYNC_REQUIRED_AT_LEAST_ONCE]: false,
  [Model.SHOULD_NOT_API_MIDDLEWARE_BE_LAUNCHED]: true,
  [Model.TYPE]: Model.ALLOWED_COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS
})
