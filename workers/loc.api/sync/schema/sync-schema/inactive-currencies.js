'use strict'

const Model = require('./model')

module.exports = new Model({
  [Model.NAME]: Model.ALLOWED_COLLS.INACTIVE_CURRENCIES,
  [Model.MAX_LIMIT]: 10_000,
  [Model.PROJECTION]: 'pairs',
  [Model.ORDER]: [['pairs', Model.ORDERS.ASC]],
  [Model.IS_SYNC_REQUIRED_AT_LEAST_ONCE]: true,
  [Model.TYPE]: Model.ALLOWED_COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY
})
