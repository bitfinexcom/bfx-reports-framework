'use strict'

const Model = require('./model')

module.exports = new Model({
  error: Model.VARCHAR,
  value: Model.DECIMAL,
  state: Model.VARCHAR
}, { hasCreateUpdateMtsTriggers: true })
