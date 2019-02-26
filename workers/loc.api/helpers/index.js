'use strict'

const {
  getMethodLimit: getMethodLimitBase,
  checkParams: checkParamsBase
} = require('bfx-report/workers/loc.api/helpers')

const schema = require('./schema')

const getMethodLimit = (sendLimit, method) => {
  const _methodsLimits = {
    candles: { default: 500, max: 500 }
  }

  return getMethodLimitBase(sendLimit, method, _methodsLimits)
}

const checkParams = (
  args,
  schemaName = 'paramsSchemaForCsv',
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

module.exports = {
  getMethodLimit,
  checkParams
}
