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

  // The API returns a lot of data with the same values,
  // that cause unique indexes are not included
  [Model.INDEX_FIELD_NAME]: [
    ['user_id', 'mtsUpdate'],
    ['user_id', 'symbol', 'mtsUpdate'],
    ['user_id', 'subUserId', 'mtsUpdate',
      'WHERE subUserId IS NOT NULL']
  ],
  [Model.CONSTR_FIELD_NAME]: [
    Model.COMMON_CONSTRAINTS.USER_ID_CONSTRAINT,
    Model.COMMON_CONSTRAINTS.SUB_USER_ID_CONSTRAINT
  ]
})
