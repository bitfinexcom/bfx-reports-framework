'use strict'

const SCHEMA_NAMES = require('../schema.names')
const {
  requireSchemas
} = require('@bitfinex/bfx-report/workers/loc.api/data-validator/helpers')

module.exports = requireSchemas(
  SCHEMA_NAMES,
  __dirname
)
