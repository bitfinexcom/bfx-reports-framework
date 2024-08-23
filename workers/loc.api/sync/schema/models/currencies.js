'use strict'

const Model = require('./model')

module.exports = new Model({
  id: Model.VARCHAR,
  name: Model.VARCHAR,
  pool: Model.VARCHAR,
  explorer: Model.TEXT,
  symbol: Model.VARCHAR,
  walletFx: Model.TEXT,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['id']
})
