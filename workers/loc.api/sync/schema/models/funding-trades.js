'use strict'

const Model = require('./model')

module.exports = new Model({
  id: Model.BIGINT,
  symbol: Model.VARCHAR,
  mtsCreate: Model.BIGINT,
  offerID: Model.BIGINT,
  amount: Model.DECIMAL,
  rate: Model.DECIMAL,
  period: Model.BIGINT,
  maker: Model.INTEGER,
  subUserId: Model.INTEGER,
  user_id: Model.INTEGER_NOT_NULL,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
  [Model.INDEX_FIELD_NAME]: [
    ['user_id', 'symbol', 'mtsCreate'],
    ['user_id', 'mtsCreate'],
    ['user_id', 'subUserId', 'mtsCreate',
      'WHERE subUserId IS NOT NULL']
  ],
  [Model.CONSTR_FIELD_NAME]: [
    Model.COMMON_CONSTRAINTS.USER_ID_CONSTRAINT,
    Model.COMMON_CONSTRAINTS.SUB_USER_ID_CONSTRAINT
  ]
})
