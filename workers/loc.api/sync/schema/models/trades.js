'use strict'

const Model = require('./model')

module.exports = new Model({
  id: Model.BIGINT,
  symbol: Model.VARCHAR,
  mtsCreate: Model.BIGINT,
  orderID: Model.BIGINT,
  execAmount: Model.DECIMAL,
  execPrice: Model.DECIMAL,
  exactUsdValue: Model.DECIMAL,
  orderType: Model.VARCHAR,
  orderPrice: Model.DECIMAL,
  maker: Model.INTEGER,
  fee: Model.DECIMAL,
  feeCurrency: Model.VARCHAR,
  subUserId: Model.INTEGER,
  _isExchange: Model.INTEGER,
  user_id: Model.INTEGER_NOT_NULL,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['id', 'symbol', 'user_id'],
  [Model.INDEX_FIELD_NAME]: [
    ['user_id', 'symbol', 'mtsCreate'],
    ['user_id', 'orderID', 'mtsCreate'],
    ['user_id', '_isExchange', 'mtsCreate'],
    ['user_id', 'mtsCreate'],
    ['user_id', 'subUserId', 'mtsCreate',
      'WHERE subUserId IS NOT NULL'],
    ['subUserId', 'orderID',
      'WHERE subUserId IS NOT NULL']
  ],
  [Model.CONSTR_FIELD_NAME]: [
    Model.COMMON_CONSTRAINTS.USER_ID_CONSTRAINT,
    Model.COMMON_CONSTRAINTS.SUB_USER_ID_CONSTRAINT
  ]
})
