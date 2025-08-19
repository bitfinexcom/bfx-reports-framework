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
    },
    apiKey: {
      type: 'string'
    },
    apiSecret: {
      type: 'string'
    },
    token: {
      type: 'string'
    },
    password: {
      type: 'string'
    },
    subAccountApiKeys: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'object',
        oneOf: [
          {
            additionalProperties: false,
            properties: {
              apiKey: {
                $ref: '#/definitions/apiKey'
              },
              apiSecret: {
                $ref: '#/definitions/apiSecret'
              }
            }
          },
          {
            additionalProperties: false,
            properties: {
              token: {
                $ref: '#/definitions/token'
              }
            }
          },
          {
            additionalProperties: false,
            properties: {
              email: {
                $ref: 'defs#/definitions/email'
              },
              password: {
                $ref: '#/definitions/password'
              }
            }
          }
        ]
      }
    },
    strategy: {
      type: 'string',
      enum: [
        'FIFO',
        'LIFO'
      ]
    },
    shouldFeesBeDeducted: {
      type: 'boolean'
    },
    isTradingFees: {
      type: 'boolean'
    },
    isFundingFees: {
      type: 'boolean'
    }
  }
}
