'use strict'

const {
  SUPPORTED_DB_VERSION,
  getModelsMap
} = require('./models')
const {
  getMethodCollMap
} = require('./sync-schema')

module.exports = {
  SUPPORTED_DB_VERSION,
  getMethodCollMap,
  getModelsMap
}
