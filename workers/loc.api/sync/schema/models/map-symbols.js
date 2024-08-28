'use strict'

const Model = require('./model')

module.exports = new Model({
  key: Model.VARCHAR,
  value: Model.VARCHAR,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['key']
})
