'use strict'

const {
  CONSTR_FIELD_NAME,
  TRIGGER_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('./model/db.service.field.names')
const {
  CREATE_UPDATE_MTS_TRIGGERS
} = require('../common.triggers')
const {
  OWNER_USER_ID_CONSTRAINT
} = require('../common.constraints')

module.exports = {
  _id: ID_PRIMARY_KEY,
  collName: 'VARCHAR(255) NOT NULL',
  state: 'VARCHAR(255)',
  createdAt: 'BIGINT',
  updatedAt: 'BIGINT',
  ownerUserId: 'INT',
  isOwnerScheduler: 'INT',

  [CONSTR_FIELD_NAME]: OWNER_USER_ID_CONSTRAINT,
  [TRIGGER_FIELD_NAME]: CREATE_UPDATE_MTS_TRIGGERS
}
