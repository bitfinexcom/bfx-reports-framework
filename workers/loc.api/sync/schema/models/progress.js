'use strict'

const {
  TRIGGER_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('../const')
const {
  CREATE_UPDATE_MTS_TRIGGERS
} = require('../common.triggers')

module.exports = {
  _id: ID_PRIMARY_KEY,
  error: 'VARCHAR(255)',
  value: 'DECIMAL(22,12)',
  state: 'VARCHAR(255)',
  createdAt: 'BIGINT',
  updatedAt: 'BIGINT',

  [TRIGGER_FIELD_NAME]: CREATE_UPDATE_MTS_TRIGGERS
}
