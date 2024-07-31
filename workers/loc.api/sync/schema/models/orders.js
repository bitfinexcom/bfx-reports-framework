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
  gid: 'BIGINT',
  cid: 'BIGINT',
  symbol: 'VARCHAR(255)',
  mtsCreate: 'BIGINT',
  mtsUpdate: 'BIGINT',
  amount: 'DECIMAL(22,12)',
  amountOrig: 'DECIMAL(22,12)',
  type: 'VARCHAR(255)',
  typePrev: 'VARCHAR(255)',
  flags: 'INT',
  status: 'VARCHAR(255)',
  price: 'DECIMAL(22,12)',
  priceAvg: 'DECIMAL(22,12)',
  priceTrailing: 'DECIMAL(22,12)',
  priceAuxLimit: 'DECIMAL(22,12)',
  notify: 'INT',
  placedId: 'BIGINT',
  _lastAmount: 'DECIMAL(22,12)',
  amountExecuted: 'DECIMAL(22,12)',
  routing: 'VARCHAR(255)',
  meta: 'TEXT', // JSON
  subUserId: 'INT',
  user_id: 'INT NOT NULL',

  [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
  [INDEX_FIELD_NAME]: [
    ['user_id', 'symbol', 'mtsUpdate'],
    ['user_id', 'type', 'mtsUpdate'],
    ['user_id', 'mtsUpdate'],
    ['user_id', 'subUserId', 'mtsUpdate',
      'WHERE subUserId IS NOT NULL']
  ],
  [CONSTR_FIELD_NAME]: [
    USER_ID_CONSTRAINT,
    SUB_USER_ID_CONSTRAINT
  ]
}
