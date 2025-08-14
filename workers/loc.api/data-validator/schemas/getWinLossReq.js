'use strict'

const SCHEMA_IDS = require('../schema.ids')

module.exports = {
  $id: SCHEMA_IDS.GET_WIN_LOSS_REQ,
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
    isUnrealizedProfitExcluded: {
      $ref: 'fwDefs#/definitions/isUnrealizedProfitExcluded'
    }
  }
}
