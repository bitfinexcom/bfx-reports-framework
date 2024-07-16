'use strict'

const {
  INDEX_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('../const')

module.exports = {
  _id: ID_PRIMARY_KEY,
  mts: 'BIGINT',
  open: 'DECIMAL(22,12)',
  close: 'DECIMAL(22,12)',
  high: 'DECIMAL(22,12)',
  low: 'DECIMAL(22,12)',
  volume: 'DECIMAL(22,12)',
  _symbol: 'VARCHAR(255)',
  _timeframe: 'VARCHAR(255)',

  [UNIQUE_INDEX_FIELD_NAME]: ['_symbol', '_timeframe', 'mts'],
  [INDEX_FIELD_NAME]: [
    ['_timeframe', '_symbol', 'mts'],
    ['_timeframe', 'mts'],
    ['_symbol', 'mts'],
    ['close', 'mts']
  ]
}
