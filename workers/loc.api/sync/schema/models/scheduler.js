'use strict'

const {
  TRIGGER_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('./model/db.service.field.names')
const {
  CREATE_UPDATE_MTS_TRIGGERS
} = require('../common.triggers')

module.exports = {
  _id: ID_PRIMARY_KEY,
  isEnable: 'INT',
  createdAt: 'BIGINT',
  updatedAt: 'BIGINT',

  [TRIGGER_FIELD_NAME]: CREATE_UPDATE_MTS_TRIGGERS
}
