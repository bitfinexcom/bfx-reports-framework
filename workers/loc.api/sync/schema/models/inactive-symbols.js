'use strict'

const Model = require('./model')

module.exports = new Model({
  pairs: Model.VARCHAR,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['pairs']
})
