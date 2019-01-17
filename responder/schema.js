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

module.exports = {
  paramsSchemaForCandlesApi
}
