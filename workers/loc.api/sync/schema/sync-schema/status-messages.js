'use strict'

const Model = require('./model')

module.exports = new Model({
  [Model.NAME]: Model.ALLOWED_COLLS.STATUS_MESSAGES,
  [Model.MAX_LIMIT]: 5_000,
  [Model.DATE_FIELD_NAME]: 'timestamp',
  [Model.SYMBOL_FIELD_NAME]: 'key',
  [Model.ORDER]: [['timestamp', Model.ORDERS.DESC]],
  [Model.CONF_NAME]: Model.PUBLIC_COLLS_CONF_NAMES.STATUS_MESSAGES_CONF,
  [Model.IS_SYNC_REQUIRED_AT_LEAST_ONCE]: false,
  [Model.TYPE]: Model.ALLOWED_COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY_OBJECTS
})
