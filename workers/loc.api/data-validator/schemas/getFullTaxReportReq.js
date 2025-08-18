'use strict'

const SCHEMA_IDS = require('../schema.ids')

module.exports = {
  $id: SCHEMA_IDS.GET_FULL_TAX_REPORT_REQ,
  type: 'object',
  additionalProperties: false,
  properties: {
    start: {
      $ref: 'defs#/definitions/start'
    },
    end: {
      $ref: 'defs#/definitions/end'
    }
  }
}
