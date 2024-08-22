'use strict'

const {
  CONSTR_FIELD_NAME,
  TRIGGER_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('./model/db.service.field.names')
const {
  CREATE_UPDATE_MTS_TRIGGERS
} = require('../common.triggers')
const {
  USER_ID_CONSTRAINT,
  SUB_USER_ID_CONSTRAINT
} = require('../common.constraints')

module.exports = {
  _id: ID_PRIMARY_KEY,
  collName: 'VARCHAR(255) NOT NULL',
  syncedAt: 'BIGINT',
  baseStart: 'BIGINT',
  baseEnd: 'BIGINT',
  isBaseStepReady: 'INT',
  currStart: 'BIGINT',
  currEnd: 'BIGINT',
  isCurrStepReady: 'INT',
  createdAt: 'BIGINT',
  updatedAt: 'BIGINT',
  subUserId: 'INT',
  user_id: 'INT',
  syncQueueId: 'INT',

  [UNIQUE_INDEX_FIELD_NAME]: [
    // It needs to cover public collections
    ['collName',
      'WHERE user_id IS NULL'],
    // It needs to cover private collections
    ['user_id', 'collName',
      'WHERE user_id IS NOT NULL AND subUserId IS NULL'],
    // It needs to cover private collections of sub-account
    ['user_id', 'subUserId', 'collName',
      'WHERE user_id IS NOT NULL AND subUserId IS NOT NULL']
  ],
  [CONSTR_FIELD_NAME]: [
    USER_ID_CONSTRAINT,
    SUB_USER_ID_CONSTRAINT
  ],
  [TRIGGER_FIELD_NAME]: CREATE_UPDATE_MTS_TRIGGERS
}
