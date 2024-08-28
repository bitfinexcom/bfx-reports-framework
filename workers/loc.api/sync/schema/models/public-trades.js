'use strict'

const Model = require('./model')

module.exports = new Model({
  id: Model.BIGINT,
  mts: Model.BIGINT,
  rate: Model.DECIMAL,
  period: Model.BIGINT,
  amount: Model.DECIMAL,
  price: Model.DECIMAL,
  _symbol: Model.VARCHAR,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['id', '_symbol'],
  [Model.INDEX_FIELD_NAME]: [
    ['_symbol', 'mts'],
    ['mts']
  ]
})
