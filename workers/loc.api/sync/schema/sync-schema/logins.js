'use strict'

const Model = require('./model')

module.exports = new Model({
  [Model.NAME]: Model.ALLOWED_COLLS.LOGINS,
  [Model.MAX_LIMIT]: 10_000,
  [Model.DATE_FIELD_NAME]: 'time',
  [Model.ORDER]: [['time', Model.ORDERS.DESC]],
  [Model.IS_SYNC_REQUIRED_AT_LEAST_ONCE]: true,
  [Model.TYPE]: Model.ALLOWED_COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS
})
