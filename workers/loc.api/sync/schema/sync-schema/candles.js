'use strict'

const Model = require('./model')

module.exports = new Model({
  [Model.NAME]: Model.ALLOWED_COLLS.CANDLES,
  [Model.MAX_LIMIT]: 10_000,
  [Model.DATE_FIELD_NAME]: 'mts',
  [Model.SYMBOL_FIELD_NAME]: '_symbol',
  [Model.TIMEFRAME_FIELD_NAME]: '_timeframe',
  [Model.ORDER]: [['mts', Model.ORDERS.DESC]],
  [Model.CONF_NAME]: Model.PUBLIC_COLLS_CONF_NAMES.CANDLES_CONF,
  [Model.IS_SYNC_REQUIRED_AT_LEAST_ONCE]: true,
  [Model.ADDITIONAL_API_CALL_ARGS]: { isNotMoreThanInnerMax: true },
  [Model.TYPE]: Model.ALLOWED_COLLS_TYPES.PUBLIC_INSERTABLE_ARRAY_OBJECTS
})
