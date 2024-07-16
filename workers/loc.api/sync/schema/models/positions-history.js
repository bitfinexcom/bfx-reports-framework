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
  id: 'BIGINT',
  symbol: 'VARCHAR(255)',
  status: 'VARCHAR(255)',
  amount: 'DECIMAL(22,12)',
  basePrice: 'DECIMAL(22,12)',
  closePrice: 'DECIMAL(22,12)',
  marginFunding: 'DECIMAL(22,12)',
  marginFundingType: 'INT',
  pl: 'DECIMAL(22,12)',
  plPerc: 'DECIMAL(22,12)',
  liquidationPrice: 'DECIMAL(22,12)',
  leverage: 'DECIMAL(22,12)',
  placeholder: 'TEXT',
  mtsCreate: 'BIGINT',
  mtsUpdate: 'BIGINT',
  subUserId: 'INT',
  user_id: 'INT NOT NULL',

  [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
  [INDEX_FIELD_NAME]: [
    ['user_id', 'symbol', 'mtsUpdate'],
    ['user_id', 'mtsUpdate', 'mtsCreate'],
    ['user_id', 'mtsUpdate'],
    ['user_id', 'subUserId', 'mtsUpdate',
      'WHERE subUserId IS NOT NULL'],
    ['subUserId', 'id',
      'WHERE subUserId IS NOT NULL']
  ],
  [CONSTR_FIELD_NAME]: [
    USER_ID_CONSTRAINT,
    SUB_USER_ID_CONSTRAINT
  ]
}
