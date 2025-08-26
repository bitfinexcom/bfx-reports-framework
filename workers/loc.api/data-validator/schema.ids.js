'use strict'

const SCHEMA_NAMES = require('./schema.names')
const {
  getSchemaIds
} = require('bfx-report/workers/loc.api/data-validator/helpers')

module.exports = getSchemaIds(SCHEMA_NAMES)
