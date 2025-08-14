'use strict'

const SCHEMA_IDS = require('../schema.ids')

module.exports = {
  $id: SCHEMA_IDS.FW_GET_CANDLES_FILE_REQ,
  type: 'object',
  additionalProperties: false,
  required: ['symbol'],
  properties: {
    start: {
      $ref: 'defs#/definitions/start'
    },
    end: {
      $ref: 'defs#/definitions/end'
    },
    limit: {
      $ref: 'defs#/definitions/limit'
    },
    symbol: {
      $ref: 'defs#/definitions/symbolWithMaxItem'
    },
    sort: {
      $ref: 'defs#/definitions/sort'
    },
    timeframe: {
      $ref: 'defs#/definitions/candleTimeframe'
    },
    section: {
      type: 'string',
      enum: ['hist']
    },
    filter: {
      $ref: 'defs#/definitions/filter'
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
