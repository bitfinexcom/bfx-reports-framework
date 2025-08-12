'use strict'

const SCHEMA_IDS = require('../schema.ids')

module.exports = {
  $id: SCHEMA_IDS.CREATE_SUB_ACCOUNT_REQ,
  type: 'object',
  additionalProperties: false,
  required: ['subAccountApiKeys'],
  properties: {
    subAccountApiKeys: {
      $ref: 'fwDefs#/definitions/subAccountApiKeys'
    },
    subAccountPassword: {
      $ref: 'fwDefs#/definitions/password'
    },
    localUsername: {
      type: 'string'
    }
  }
}
