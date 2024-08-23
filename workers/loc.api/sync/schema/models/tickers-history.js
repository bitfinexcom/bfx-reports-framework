'use strict'

const Model = require('./model')

module.exports = new Model({
  symbol: Model.VARCHAR,
  bid: Model.DECIMAL,
  bidPeriod: Model.INTEGER,
  ask: Model.DECIMAL,
  mtsUpdate: Model.BIGINT,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['mtsUpdate', 'symbol'],
  [Model.INDEX_FIELD_NAME]: [
    ['symbol', 'mtsUpdate']
  ]
})
