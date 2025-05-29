'use strict'

const Model = require('./model')

module.exports = new Model({
  [Model.NAME]: Model.ALLOWED_COLLS.PUBLIC_TRADES,
  [Model.MAX_LIMIT]: 5_000,
  [Model.DATE_FIELD_NAME]: 'mts',
  [Model.SYMBOL_FIELD_NAME]: '_symbol',
  [Model.ORDER]: [['mts', Model.ORDERS.DESC]],
  [Model.CONF_NAME]: Model.PUBLIC_COLLS_CONF_NAMES.PUBLIC_TRADES_CONF,
  [Model.IS_SYNC_REQUIRED_AT_LEAST_ONCE]: false,
  [Model.ADDITIONAL_API_CALL_ARGS]: { isNotMoreThanInnerMax: true },
  [Model.TYPE]: Model.ALLOWED_COLLS_TYPES.PUBLIC_INSERTABLE_ARRAY_OBJECTS
})
