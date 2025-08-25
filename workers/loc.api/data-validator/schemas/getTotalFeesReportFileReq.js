'use strict'

const SCHEMA_IDS = require('../schema.ids')

module.exports = {
  $id: SCHEMA_IDS.GET_TOTAL_FEES_REPORT_FILE_REQ,
  type: 'object',
  additionalProperties: false,
  properties: {
    start: {
      $ref: 'defs#/definitions/start'
    },
    end: {
      $ref: 'defs#/definitions/end'
    },
    timeframe: {
      $ref: 'fwDefs#/definitions/timeframe'
    },
    symbol: {
      $ref: 'defs#/definitions/symbol'
    },
    isTradingFees: {
      $ref: 'fwDefs#/definitions/isTradingFees'
    },
    isFundingFees: {
      $ref: 'fwDefs#/definitions/isFundingFees'
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
