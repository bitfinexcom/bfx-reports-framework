'use strict'

const Model = require('./model')

module.exports = new Model({
  collName: Model.VARCHAR_NOT_NULL,
  syncedAt: Model.BIGINT,
  baseStart: Model.BIGINT,
  baseEnd: Model.BIGINT,
  isBaseStepReady: Model.INTEGER,
  currStart: Model.BIGINT,
  currEnd: Model.BIGINT,
  isCurrStepReady: Model.INTEGER,
  subUserId: Model.INTEGER,
  user_id: Model.INTEGER,
  syncQueueId: Model.INTEGER,

  [Model.UNIQUE_INDEX_FIELD_NAME]: [
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
  [Model.CONSTR_FIELD_NAME]: [
    Model.COMMON_CONSTRAINTS.USER_ID_CONSTRAINT,
    Model.COMMON_CONSTRAINTS.SUB_USER_ID_CONSTRAINT
  ]
}, { hasCreateUpdateMtsTriggers: true })
