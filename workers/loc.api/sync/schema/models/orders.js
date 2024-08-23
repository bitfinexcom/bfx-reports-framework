'use strict'

const Model = require('./model')

module.exports = new Model({
  id: Model.BIGINT,
  gid: Model.BIGINT,
  cid: Model.BIGINT,
  symbol: Model.VARCHAR,
  mtsCreate: Model.BIGINT,
  mtsUpdate: Model.BIGINT,
  amount: Model.DECIMAL,
  amountOrig: Model.DECIMAL,
  type: Model.VARCHAR,
  typePrev: Model.VARCHAR,
  flags: Model.INTEGER,
  status: Model.VARCHAR,
  price: Model.DECIMAL,
  priceAvg: Model.DECIMAL,
  priceTrailing: Model.DECIMAL,
  priceAuxLimit: Model.DECIMAL,
  notify: Model.INTEGER,
  placedId: Model.BIGINT,
  _lastAmount: Model.DECIMAL,
  amountExecuted: Model.DECIMAL,
  routing: Model.VARCHAR,
  meta: Model.TEXT, // JSON
  subUserId: Model.INTEGER,
  user_id: Model.INTEGER_NOT_NULL,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
  [Model.INDEX_FIELD_NAME]: [
    ['user_id', 'symbol', 'mtsUpdate'],
    ['user_id', 'type', 'mtsUpdate'],
    ['user_id', 'mtsUpdate'],
    ['user_id', 'subUserId', 'mtsUpdate',
      'WHERE subUserId IS NOT NULL']
  ],
  [Model.CONSTR_FIELD_NAME]: [
    Model.COMMON_CONSTRAINTS.USER_ID_CONSTRAINT,
    Model.COMMON_CONSTRAINTS.SUB_USER_ID_CONSTRAINT
  ]
})
