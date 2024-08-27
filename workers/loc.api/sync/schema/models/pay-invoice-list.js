'use strict'

const Model = require('./model')

module.exports = new Model({
  id: Model.VARCHAR,
  t: Model.BIGINT,
  duration: Model.INTEGER,
  amount: Model.DECIMAL,
  currency: Model.VARCHAR,
  orderId: Model.VARCHAR,
  payCurrencies: Model.TEXT, // JSON
  webhook: Model.VARCHAR,
  redirectUrl: Model.VARCHAR,
  status: Model.VARCHAR,
  customerInfo: Model.TEXT, // JSON
  invoices: Model.TEXT, // JSON
  payment: Model.TEXT, // JSON
  merchantName: Model.VARCHAR,
  subUserId: Model.INTEGER,
  user_id: Model.INTEGER_NOT_NULL,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
  [Model.INDEX_FIELD_NAME]: [
    ['user_id', 'currency', 't'],
    ['user_id', 'id', 't'],
    ['user_id', 't'],
    ['user_id', 'subUserId', 't',
      'WHERE subUserId IS NOT NULL'],
    ['subUserId', 'id',
      'WHERE subUserId IS NOT NULL']
  ],
  [Model.CONSTR_FIELD_NAME]: [
    Model.COMMON_CONSTRAINTS.USER_ID_CONSTRAINT,
    Model.COMMON_CONSTRAINTS.SUB_USER_ID_CONSTRAINT
  ]
})
