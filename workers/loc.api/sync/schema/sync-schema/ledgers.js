'use strict'

const Model = require('./model')

module.exports = new Model({
  [Model.NAME]: Model.ALLOWED_COLLS.LEDGERS,
  [Model.MAX_LIMIT]: 2_500,
  [Model.DATE_FIELD_NAME]: 'mts',
  [Model.SYMBOL_FIELD_NAME]: 'currency',
  [Model.ORDER]: [['mts', Model.ORDERS.DESC], ['id', Model.ORDERS.DESC]],
  [Model.IS_SYNC_REQUIRED_AT_LEAST_ONCE]: true,
  [Model.TYPE]: Model.ALLOWED_COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS
})
