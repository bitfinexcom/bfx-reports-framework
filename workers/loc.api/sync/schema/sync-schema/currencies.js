'use strict'

const Model = require('./model')

module.exports = new Model({
  [Model.NAME]: Model.ALLOWED_COLLS.CURRENCIES,
  [Model.MAX_LIMIT]: 10_000,
  [Model.ORDER]: [['name', Model.ORDERS.ASC]],
  [Model.IS_SYNC_REQUIRED_AT_LEAST_ONCE]: true,
  [Model.TYPE]: Model.ALLOWED_COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY_OBJECTS
})
