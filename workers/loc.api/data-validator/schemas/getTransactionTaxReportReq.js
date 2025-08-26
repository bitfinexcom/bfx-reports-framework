'use strict'

const SCHEMA_IDS = require('../schema.ids')

module.exports = {
  $id: SCHEMA_IDS.GET_TRANSACTION_TAX_REPORT_REQ,
  type: 'object',
  additionalProperties: false,
  properties: {
    start: {
      $ref: 'defs#/definitions/start'
    },
    end: {
      $ref: 'defs#/definitions/end'
    },
    strategy: {
      $ref: 'fwDefs#/definitions/strategy'
    },
    shouldFeesBeDeducted: {
      $ref: 'fwDefs#/definitions/shouldFeesBeDeducted'
    }
  }
}
