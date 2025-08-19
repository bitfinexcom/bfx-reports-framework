'use strict'

const SCHEMA_IDS = require('../schema.ids')

module.exports = {
  $id: SCHEMA_IDS.GET_TOTAL_FEES_REPORT_REQ,
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
    }
  }
}
