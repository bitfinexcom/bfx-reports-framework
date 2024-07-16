'use strict'

const {
  CONSTR_FIELD_NAME,
  TRIGGER_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('../const')
const {
  CREATE_UPDATE_MTS_TRIGGERS
} = require('../common.triggers')
const {
  USER_ID_CONSTRAINT
} = require('../common.constraints')

module.exports = {
  _id: ID_PRIMARY_KEY,
  confName: 'VARCHAR(255)',
  symbol: 'VARCHAR(255)',
  start: 'BIGINT',
  timeframe: 'VARCHAR(255)',
  createdAt: 'BIGINT',
  updatedAt: 'BIGINT',
  user_id: 'INT NOT NULL',

  [UNIQUE_INDEX_FIELD_NAME]: [
    'symbol', 'user_id', 'confName', 'timeframe'
  ],
  [CONSTR_FIELD_NAME]: USER_ID_CONSTRAINT,
  [TRIGGER_FIELD_NAME]: CREATE_UPDATE_MTS_TRIGGERS
}
