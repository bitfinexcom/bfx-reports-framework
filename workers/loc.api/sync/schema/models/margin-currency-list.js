'use strict'

const Model = require('./model')

module.exports = new Model({
  symbol: Model.VARCHAR,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['symbol']
})
