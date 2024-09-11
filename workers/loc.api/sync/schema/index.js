'use strict'

const {
  SUPPORTED_DB_VERSION,
  getModelsMap,
  getModelOf
} = require('./models')
const {
  getMethodCollMap
} = require('./sync-schema')

module.exports = {
  SUPPORTED_DB_VERSION,
  getMethodCollMap,
  getModelsMap,
  getModelOf
}
