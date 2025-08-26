'use strict'

const SCHEMA_NAMES = require('../schema.names')
const {
  requireSchemas
} = require('bfx-report/workers/loc.api/data-validator/helpers')

module.exports = requireSchemas(
  SCHEMA_NAMES,
  __dirname
)
