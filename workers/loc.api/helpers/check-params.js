'use strict'

const {
  checkParams: checkParamsBase
} = require('bfx-report/workers/loc.api/helpers')

const schema = require('./schema')

module.exports = (
  args,
  schemaName = 'paramsSchemaForFile',
  requireFields = [],
  checkParamsField = false
) => {
  checkParamsBase(
    args,
    schemaName,
    requireFields,
    checkParamsField,
    schema
  )
}
