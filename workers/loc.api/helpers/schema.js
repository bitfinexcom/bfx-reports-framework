'use strict'

const paramsSchemaForCandlesApi = {
  type: 'object',
  properties: {
    timeframe: {
      type: 'string'
    },
    symbol: {
      type: 'string'
    },
    section: {
      type: 'string'
    },
    limit: {
      type: 'integer'
    },
    start: {
      type: 'integer'
    },
    end: {
      type: 'integer'
    },
    sort: {
      type: 'integer'
    }
  }
}

const paramsSchemaForRiskApi = {
  type: 'object',
  properties: {
    timeframe: {
      type: 'string',
      enum: [
        'day',
        'month',
        'year'
      ]
    },
    start: {
      type: 'integer'
    },
    end: {
      type: 'integer'
    },
    skip: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'string',
        enum: [
          'trades',
          'marginTrades',
          'fundingPayment',
          'movementFees'
        ]
      }
    }
  }
}

module.exports = {
  paramsSchemaForCandlesApi,
  paramsSchemaForRiskApi
}
