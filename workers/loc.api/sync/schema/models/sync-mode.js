'use strict'

const Model = require('./model')

module.exports = new Model({
  isEnable: Model.INTEGER
}, { hasCreateUpdateMtsTriggers: true })
