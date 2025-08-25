'use strict'

const SCHEMA_IDS = require('../schema.ids')

module.exports = {
  $id: SCHEMA_IDS.GET_FULL_SNAPSHOT_REPORT_REQ,
  type: 'object',
  additionalProperties: false,
  properties: {
    end: {
      $ref: 'defs#/definitions/end'
    }
  }
}
