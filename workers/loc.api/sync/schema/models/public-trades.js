'use strict'

const {
  INDEX_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('./model/db.service.field.names')

module.exports = {
  _id: ID_PRIMARY_KEY,
  id: 'BIGINT',
  mts: 'BIGINT',
  rate: 'DECIMAL(22,12)',
  period: 'BIGINT',
  amount: 'DECIMAL(22,12)',
  price: 'DECIMAL(22,12)',
  _symbol: 'VARCHAR(255)',

  [UNIQUE_INDEX_FIELD_NAME]: ['id', '_symbol'],
  [INDEX_FIELD_NAME]: [
    ['_symbol', 'mts'],
    ['mts']
  ]
}
