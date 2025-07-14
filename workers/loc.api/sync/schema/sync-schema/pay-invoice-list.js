'use strict'

const Model = require('./model')

module.exports = new Model({
  [Model.NAME]: Model.ALLOWED_COLLS.PAY_INVOICE_LIST,
  [Model.MAX_LIMIT]: 100,
  [Model.DATE_FIELD_NAME]: 't',
  [Model.SYMBOL_FIELD_NAME]: 'currency',
  [Model.ORDER]: [['t', Model.ORDERS.DESC]],
  [Model.IS_SYNC_REQUIRED_AT_LEAST_ONCE]: false,
  [Model.TYPE]: Model.ALLOWED_COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS
})
