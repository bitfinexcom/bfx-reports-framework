'use strict'

const Model = require('./model')

module.exports = new Model({
  mtsCreate: Model.BIGINT,
  log: Model.VARCHAR,
  ip: Model.VARCHAR,
  userAgent: Model.TEXT,
  subUserId: Model.INTEGER,
  user_id: Model.INTEGER_NOT_NULL,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['mtsCreate', 'log', 'user_id'],
  [Model.INDEX_FIELD_NAME]: [
    ['user_id', 'mtsCreate'],
    ['user_id', 'subUserId', 'mtsCreate',
      'WHERE subUserId IS NOT NULL']
  ],
  [Model.CONSTR_FIELD_NAME]: [
    Model.COMMON_CONSTRAINTS.USER_ID_CONSTRAINT,
    Model.COMMON_CONSTRAINTS.SUB_USER_ID_CONSTRAINT
  ]
})
