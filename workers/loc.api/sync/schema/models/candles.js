'use strict'

const Model = require('./model')

module.exports = new Model({
  mts: Model.BIGINT,
  open: Model.DECIMAL,
  close: Model.DECIMAL,
  high: Model.DECIMAL,
  low: Model.DECIMAL,
  volume: Model.DECIMAL,
  _symbol: Model.VARCHAR,
  _timeframe: Model.VARCHAR,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['_symbol', '_timeframe', 'mts'],
  [Model.INDEX_FIELD_NAME]: [
    ['_timeframe', '_symbol', 'mts'],
    ['_timeframe', 'mts'],
    ['_symbol', 'mts'],
    ['close', 'mts']
  ]
})
