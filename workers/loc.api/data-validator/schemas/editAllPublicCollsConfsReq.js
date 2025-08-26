'use strict'

const SCHEMA_IDS = require('../schema.ids')

module.exports = {
  $id: SCHEMA_IDS.EDIT_ALL_PUBLIC_COLLS_CONFS_REQ,
  type: 'object',
  additionalProperties: false,
  properties: {
    candlesConf: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['symbol', 'start', 'timeframe'],
        properties: {
          start: {
            $ref: 'defs#/definitions/start'
          },
          symbol: {
            $ref: 'defs#/definitions/strSymbol'
          },
          timeframe: {
            $ref: 'defs#/definitions/candleTimeframe'
          }
        }
      }
    },
    statusMessagesConf: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['symbol', 'start'],
        properties: {
          start: {
            $ref: 'defs#/definitions/start'
          },
          symbol: {
            $ref: 'defs#/definitions/strSymbol'
          }
        }
      }
    },
    tickersHistoryConf: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['symbol', 'start'],
        properties: {
          start: {
            $ref: 'defs#/definitions/start'
          },
          symbol: {
            $ref: 'defs#/definitions/strSymbol'
          }
        }
      }
    },
    publicTradesConf: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['symbol', 'start'],
        properties: {
          start: {
            $ref: 'defs#/definitions/start'
          },
          symbol: {
            $ref: 'defs#/definitions/strSymbol'
          }
        }
      }
    }
  }
}
