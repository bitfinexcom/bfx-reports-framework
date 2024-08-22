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
  currency: 'VARCHAR(255)',
  currencyName: 'VARCHAR(255)',
  mtsStarted: 'BIGINT',
  mtsUpdated: 'BIGINT',
  status: 'VARCHAR(255)',
  amount: 'DECIMAL(22,12)',
  amountUsd: 'DECIMAL(22,12)',
  exactUsdValue: 'DECIMAL(22,12)',
  fees: 'DECIMAL(22,12)',
  destinationAddress: 'VARCHAR(255)',
  transactionId: 'VARCHAR(255)',
  note: 'TEXT',
  subUserId: 'INT',
  user_id: 'INT NOT NULL',

  [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
  [INDEX_FIELD_NAME]: [
    ['user_id', 'status', 'mtsStarted'],
    ['user_id', 'status', 'mtsUpdated'],
    ['user_id', 'currency', 'mtsUpdated'],
    ['user_id', 'mtsUpdated'],
    ['user_id', 'subUserId', 'mtsUpdated',
      'WHERE subUserId IS NOT NULL']
  ],
  [CONSTR_FIELD_NAME]: [
    USER_ID_CONSTRAINT,
    SUB_USER_ID_CONSTRAINT
  ]
}
