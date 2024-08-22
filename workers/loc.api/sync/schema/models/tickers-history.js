'use strict'

const {
  INDEX_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('./model/db.service.field.names')

module.exports = {
  _id: ID_PRIMARY_KEY,
  symbol: 'VARCHAR(255)',
  bid: 'DECIMAL(22,12)',
  bidPeriod: 'INT',
  ask: 'DECIMAL(22,12)',
  mtsUpdate: 'BIGINT',

  [UNIQUE_INDEX_FIELD_NAME]: ['mtsUpdate', 'symbol'],
  [INDEX_FIELD_NAME]: [
    ['symbol', 'mtsUpdate']
  ]
}
