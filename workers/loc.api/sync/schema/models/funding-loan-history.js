'use strict'

const Model = require('./model')

module.exports = new Model({
  id: Model.BIGINT,
  symbol: Model.VARCHAR,
  side: Model.INTEGER,
  mtsCreate: Model.BIGINT,
  mtsUpdate: Model.BIGINT,
  amount: Model.DECIMAL,
  flags: Model.TEXT,
  status: Model.TEXT,
  rate: Model.VARCHAR,
  period: Model.INTEGER,
  mtsOpening: Model.BIGINT,
  mtsLastPayout: Model.BIGINT,
  notify: Model.INTEGER,
  hidden: Model.INTEGER,
  renew: Model.INTEGER,
  rateReal: Model.INTEGER,
  noClose: Model.INTEGER,
  subUserId: Model.INTEGER,
  user_id: Model.INTEGER_NOT_NULL,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
  [Model.INDEX_FIELD_NAME]: [
    ['user_id', 'symbol', 'mtsUpdate'],
    ['user_id', 'status', 'mtsUpdate'],
    ['user_id', 'mtsUpdate'],
    ['user_id', 'subUserId', 'mtsUpdate',
      'WHERE subUserId IS NOT NULL']
  ],
  [Model.CONSTR_FIELD_NAME]: [
    Model.COMMON_CONSTRAINTS.USER_ID_CONSTRAINT,
    Model.COMMON_CONSTRAINTS.SUB_USER_ID_CONSTRAINT
  ]
})
