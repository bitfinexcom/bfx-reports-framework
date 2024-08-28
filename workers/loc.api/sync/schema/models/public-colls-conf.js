'use strict'

const Model = require('./model')

module.exports = new Model({
  confName: Model.VARCHAR,
  symbol: Model.VARCHAR,
  start: Model.BIGINT,
  timeframe: Model.VARCHAR,
  user_id: Model.INTEGER_NOT_NULL,

  [Model.UNIQUE_INDEX_FIELD_NAME]: [
    'symbol', 'user_id', 'confName', 'timeframe'
  ],
  [Model.CONSTR_FIELD_NAME]: Model.COMMON_CONSTRAINTS
    .USER_ID_CONSTRAINT
}, { hasCreateUpdateMtsTriggers: true })
