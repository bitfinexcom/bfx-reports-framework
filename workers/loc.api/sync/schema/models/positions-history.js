'use strict'

const Model = require('./model')

module.exports = new Model({
  id: Model.BIGINT,
  symbol: Model.VARCHAR,
  status: Model.VARCHAR,
  amount: Model.DECIMAL,
  basePrice: Model.DECIMAL,
  closePrice: Model.DECIMAL,
  marginFunding: Model.DECIMAL,
  marginFundingType: Model.INTEGER,
  pl: Model.DECIMAL,
  plPerc: Model.DECIMAL,
  liquidationPrice: Model.DECIMAL,
  leverage: Model.DECIMAL,
  placeholder: Model.TEXT,
  mtsCreate: Model.BIGINT,
  mtsUpdate: Model.BIGINT,
  subUserId: Model.INTEGER,
  user_id: Model.INTEGER_NOT_NULL,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
  [Model.INDEX_FIELD_NAME]: [
    ['user_id', 'symbol', 'mtsUpdate'],
    ['user_id', 'mtsUpdate', 'mtsCreate'],
    ['user_id', 'mtsUpdate'],
    ['user_id', 'subUserId', 'mtsUpdate',
      'WHERE subUserId IS NOT NULL'],
    ['subUserId', 'id',
      'WHERE subUserId IS NOT NULL']
  ],
  [Model.CONSTR_FIELD_NAME]: [
    Model.COMMON_CONSTRAINTS.USER_ID_CONSTRAINT,
    Model.COMMON_CONSTRAINTS.SUB_USER_ID_CONSTRAINT
  ]
})
