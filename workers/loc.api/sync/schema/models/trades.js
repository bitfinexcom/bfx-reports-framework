'use strict'

const {
  CONSTR_FIELD_NAME,
  INDEX_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('./model/db.service.field.names')
const {
  USER_ID_CONSTRAINT,
  SUB_USER_ID_CONSTRAINT
} = require('./model/common.constraints')

module.exports = {
  _id: ID_PRIMARY_KEY,
  id: 'BIGINT',
  symbol: 'VARCHAR(255)',
  mtsCreate: 'BIGINT',
  orderID: 'BIGINT',
  execAmount: 'DECIMAL(22,12)',
  execPrice: 'DECIMAL(22,12)',
  exactUsdValue: 'DECIMAL(22,12)',
  orderType: 'VARCHAR(255)',
  orderPrice: 'DECIMAL(22,12)',
  maker: 'INT',
  fee: 'DECIMAL(22,12)',
  feeCurrency: 'VARCHAR(255)',
  subUserId: 'INT',
  _isExchange: 'INT',
  user_id: 'INT NOT NULL',

  [UNIQUE_INDEX_FIELD_NAME]: ['id', 'symbol', 'user_id'],
  [INDEX_FIELD_NAME]: [
    ['user_id', 'symbol', 'mtsCreate'],
    ['user_id', 'orderID', 'mtsCreate'],
    ['user_id', '_isExchange', 'mtsCreate'],
    ['user_id', 'mtsCreate'],
    ['user_id', 'subUserId', 'mtsCreate',
      'WHERE subUserId IS NOT NULL'],
    ['subUserId', 'orderID',
      'WHERE subUserId IS NOT NULL']
  ],
  [CONSTR_FIELD_NAME]: [
    USER_ID_CONSTRAINT,
    SUB_USER_ID_CONSTRAINT
  ]
}
