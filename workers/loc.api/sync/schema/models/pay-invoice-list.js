'use strict'

const {
  CONSTR_FIELD_NAME,
  INDEX_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('../const')
const {
  USER_ID_CONSTRAINT,
  SUB_USER_ID_CONSTRAINT
} = require('../common.constraints')

module.exports = {
  _id: ID_PRIMARY_KEY,
  id: 'VARCHAR(255)',
  t: 'BIGINT',
  duration: 'INT',
  amount: 'DECIMAL(22,12)',
  currency: 'VARCHAR(255)',
  orderId: 'VARCHAR(255)',
  payCurrencies: 'TEXT', // JSON
  webhook: 'VARCHAR(255)',
  redirectUrl: 'VARCHAR(255)',
  status: 'VARCHAR(255)',
  customerInfo: 'TEXT', // JSON
  invoices: 'TEXT', // JSON
  payment: 'TEXT', // JSON
  merchantName: 'VARCHAR(255)',
  subUserId: 'INT',
  user_id: 'INT NOT NULL',

  [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
  [INDEX_FIELD_NAME]: [
    ['user_id', 'currency', 't'],
    ['user_id', 'id', 't'],
    ['user_id', 't'],
    ['user_id', 'subUserId', 't',
      'WHERE subUserId IS NOT NULL'],
    ['subUserId', 'id',
      'WHERE subUserId IS NOT NULL']
  ],
  [CONSTR_FIELD_NAME]: [
    USER_ID_CONSTRAINT,
    SUB_USER_ID_CONSTRAINT
  ]
}
