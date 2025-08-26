'use strict'

const SCHEMA_IDS = require('../schema.ids')

module.exports = {
  $id: SCHEMA_IDS.UPDATE_SUB_ACCOUNT_REQ,
  type: 'object',
  additionalProperties: false,
  properties: {
    addingSubUsers: {
      $ref: 'fwDefs#/definitions/subAccountApiKeys'
    },
    removingSubUsersByEmails: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          email: {
            $ref: 'defs#/definitions/email'
          }
        }
      }
    }
  }
}
