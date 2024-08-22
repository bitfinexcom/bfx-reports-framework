'use strict'

const {
  INDEX_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('./model/db.service.field.names')

module.exports = {
  _id: ID_PRIMARY_KEY,
  key: 'VARCHAR(255)',
  timestamp: 'BIGINT',
  price: 'DECIMAL(22,12)',
  priceSpot: 'DECIMAL(22,12)',
  fundBal: 'DECIMAL(22,12)',
  fundingAccrued: 'DECIMAL(22,12)',
  fundingStep: 'DECIMAL(22,12)',
  clampMin: 'DECIMAL(22,12)',
  clampMax: 'DECIMAL(22,12)',
  _type: 'VARCHAR(255)',

  [UNIQUE_INDEX_FIELD_NAME]: ['key', '_type'],
  [INDEX_FIELD_NAME]: [
    ['key', 'timestamp']
  ]
}
