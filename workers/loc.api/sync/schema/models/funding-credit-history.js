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
} = require('../common.constraints')

module.exports = {
  _id: ID_PRIMARY_KEY,
  id: 'BIGINT',
  symbol: 'VARCHAR(255)',
  side: 'INT',
  mtsCreate: 'BIGINT',
  mtsUpdate: 'BIGINT',
  amount: 'DECIMAL(22,12)',
  flags: 'TEXT',
  status: 'TEXT',
  rate: 'VARCHAR(255)',
  period: 'INT',
  mtsOpening: 'BIGINT',
  mtsLastPayout: 'BIGINT',
  notify: 'INT',
  hidden: 'INT',
  renew: 'INT',
  rateReal: 'INT',
  noClose: 'INT',
  positionPair: 'VARCHAR(255)',
  subUserId: 'INT',
  user_id: 'INT NOT NULL',

  [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
  [INDEX_FIELD_NAME]: [
    ['user_id', 'symbol', 'mtsUpdate'],
    ['user_id', 'status', 'mtsUpdate'],
    ['user_id', 'mtsUpdate'],
    ['user_id', 'subUserId', 'mtsUpdate',
      'WHERE subUserId IS NOT NULL']
  ],
  [CONSTR_FIELD_NAME]: [
    USER_ID_CONSTRAINT,
    SUB_USER_ID_CONSTRAINT
  ]
}
