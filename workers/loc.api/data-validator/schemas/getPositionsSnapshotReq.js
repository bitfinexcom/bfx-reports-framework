'use strict'

const SCHEMA_IDS = require('../schema.ids')

module.exports = {
  $id: SCHEMA_IDS.GET_POSITIONS_SNAPSHOT_REQ,
  type: 'object',
  additionalProperties: false,
  properties: {
    end: {
      $ref: 'defs#/definitions/end'
    }
  }
}
