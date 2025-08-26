'use strict'

const SCHEMA_IDS = require('../schema.ids')

module.exports = {
  $id: SCHEMA_IDS.INTERRUPT_OPERATIONS_REQ,
  type: 'object',
  additionalProperties: false,
  required: ['names'],
  properties: {
    names: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'string',
        enum: [
          'TRX_TAX_REPORT_INTERRUPTER'
        ]
      }
    }
  }
}
