'use strict'

const Model = require('./model')

module.exports = new Model({
  id: Model.BIGINT,
  currency: Model.VARCHAR,
  currencyName: Model.VARCHAR,
  mtsStarted: Model.BIGINT,
  mtsUpdated: Model.BIGINT,
  status: Model.VARCHAR,
  amount: Model.DECIMAL,
  amountUsd: Model.DECIMAL,
  exactUsdValue: Model.DECIMAL,
  fees: Model.DECIMAL,
  destinationAddress: Model.VARCHAR,
  transactionId: Model.VARCHAR,
  note: Model.TEXT,
  subUserId: Model.INTEGER,
  user_id: Model.INTEGER_NOT_NULL,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
  [Model.INDEX_FIELD_NAME]: [
    ['user_id', 'status', 'mtsStarted'],
    ['user_id', 'status', 'mtsUpdated'],
    ['user_id', 'currency', 'mtsUpdated'],
    ['user_id', 'mtsUpdated'],
    ['user_id', 'subUserId', 'mtsUpdated',
      'WHERE subUserId IS NOT NULL']
  ],
  [Model.CONSTR_FIELD_NAME]: [
    Model.COMMON_CONSTRAINTS.USER_ID_CONSTRAINT,
    Model.COMMON_CONSTRAINTS.SUB_USER_ID_CONSTRAINT
  ]
})
