'use strict'

const Model = require('./model')

module.exports = new Model({
  [Model.NAME]: Model.ALLOWED_COLLS.TICKERS_HISTORY,
  [Model.MAX_LIMIT]: 10_000,
  [Model.DATE_FIELD_NAME]: 'mtsUpdate',
  [Model.SYMBOL_FIELD_NAME]: 'symbol',
  [Model.ORDER]: [['mtsUpdate', Model.ORDERS.DESC]],
  [Model.CONF_NAME]: Model.PUBLIC_COLLS_CONF_NAMES.TICKERS_HISTORY_CONF,
  [Model.IS_SYNC_REQUIRED_AT_LEAST_ONCE]: false,
  [Model.ADDITIONAL_API_CALL_ARGS]: { isNotMoreThanInnerMax: true },
  [Model.TYPE]: Model.ALLOWED_COLLS_TYPES.PUBLIC_INSERTABLE_ARRAY_OBJECTS
})
