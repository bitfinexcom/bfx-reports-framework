'use strict'

const SCHEMA_IDS = require('../schema.ids')

module.exports = {
  $id: SCHEMA_IDS.GET_FULL_SNAPSHOT_REPORT_FILE_REQ,
  type: 'object',
  additionalProperties: false,
  properties: {
    end: {
      $ref: 'defs#/definitions/end'
    },
    isStartSnapshot: {
      type: 'boolean'
    },
    isEndSnapshot: {
      type: 'boolean'
    },

    email: {
      $ref: 'defs#/definitions/email'
    },
    milliseconds: {
      $ref: 'defs#/definitions/milliseconds'
    },
    dateFormat: {
      $ref: 'defs#/definitions/dateFormat'
    },
    language: {
      $ref: 'defs#/definitions/language'
    },
    timezone: {
      $ref: 'defs#/definitions/timezone'
    },
    isPDFRequired: {
      $ref: 'defs#/definitions/isPDFRequired'
    },
    isSignatureRequired: {
      $ref: 'defs#/definitions/isSignatureRequired'
    }
  }
}
