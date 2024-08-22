'use strict'

const {
  CONSTR_FIELD_NAME,
  TRIGGER_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('./model/db.service.field.names')
const {
  CREATE_UPDATE_MTS_TRIGGERS,
  DELETE_SUB_USERS_TRIGGER
} = require('../common.triggers')
const {
  MASTER_USER_ID_CONSTRAINT,
  SUB_USER_ID_CONSTRAINT
} = require('../common.constraints')

module.exports = {
  _id: ID_PRIMARY_KEY,
  masterUserId: 'INT NOT NULL',
  subUserId: 'INT NOT NULL',
  createdAt: 'BIGINT',
  updatedAt: 'BIGINT',

  [CONSTR_FIELD_NAME]: [
    MASTER_USER_ID_CONSTRAINT,
    SUB_USER_ID_CONSTRAINT
  ],
  [TRIGGER_FIELD_NAME]: [
    DELETE_SUB_USERS_TRIGGER,
    ...CREATE_UPDATE_MTS_TRIGGERS
  ]
}
