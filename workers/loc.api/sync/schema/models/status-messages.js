'use strict'

const Model = require('./model')

module.exports = new Model({
  key: Model.VARCHAR,
  timestamp: Model.BIGINT,
  price: Model.DECIMAL,
  priceSpot: Model.DECIMAL,
  fundBal: Model.DECIMAL,
  fundingAccrued: Model.DECIMAL,
  fundingStep: Model.DECIMAL,
  clampMin: Model.DECIMAL,
  clampMax: Model.DECIMAL,
  _type: Model.VARCHAR,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['key', '_type'],
  [Model.INDEX_FIELD_NAME]: [
    ['key', 'timestamp']
  ]
})
