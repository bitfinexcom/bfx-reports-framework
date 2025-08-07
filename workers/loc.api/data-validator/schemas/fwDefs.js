'use strict'

const SCHEMA_IDS = require('../schema.ids')

module.exports = {
  $id: SCHEMA_IDS.FW_DEFS,
  definitions: {
    timeframe: {
      type: 'string',
      enum: [
        'day',
        'week',
        'month',
        'year'
      ]
    },
    isUnrealizedProfitExcluded: {
      type: 'boolean'
    }
  }
}
