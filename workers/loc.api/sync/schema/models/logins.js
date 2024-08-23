'use strict'

const Model = require('./model')

module.exports = new Model({
  id: Model.BIGINT,
  time: Model.BIGINT,
  ip: Model.VARCHAR,
  extraData: Model.TEXT,
  subUserId: Model.INTEGER,
  user_id: Model.INTEGER_NOT_NULL,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
  [Model.INDEX_FIELD_NAME]: [
    ['user_id', 'time'],
    ['user_id', 'subUserId', 'time',
      'WHERE subUserId IS NOT NULL']
  ],
  [Model.CONSTR_FIELD_NAME]: [
    Model.COMMON_CONSTRAINTS.USER_ID_CONSTRAINT,
    Model.COMMON_CONSTRAINTS.SUB_USER_ID_CONSTRAINT
  ]
})
