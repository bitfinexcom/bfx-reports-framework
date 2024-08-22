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
  offerID: 'BIGINT',
  amount: 'DECIMAL(22,12)',
  rate: 'DECIMAL(22,12)',
  period: 'BIGINT',
  maker: 'INT',
  subUserId: 'INT',
  user_id: 'INT NOT NULL',

  [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
  [INDEX_FIELD_NAME]: [
    ['user_id', 'symbol', 'mtsCreate'],
    ['user_id', 'mtsCreate'],
    ['user_id', 'subUserId', 'mtsCreate',
      'WHERE subUserId IS NOT NULL']
  ],
  [CONSTR_FIELD_NAME]: [
    USER_ID_CONSTRAINT,
    SUB_USER_ID_CONSTRAINT
  ]
}
