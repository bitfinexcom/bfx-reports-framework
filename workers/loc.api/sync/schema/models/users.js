'use strict'

const {
  TRIGGER_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('./model/db.service.field.names')
const {
  CREATE_UPDATE_API_KEYS_TRIGGERS,
  CREATE_UPDATE_MTS_TRIGGERS
} = require('./model/common.triggers')

module.exports = {
  _id: ID_PRIMARY_KEY,
  id: 'BIGINT',
  email: 'VARCHAR(255)',
  apiKey: 'VARCHAR(255)',
  apiSecret: 'VARCHAR(255)',
  authToken: 'VARCHAR(255)',
  active: 'INT',
  isDataFromDb: 'INT',
  timezone: 'VARCHAR(255)',
  username: 'VARCHAR(255)',
  localUsername: 'VARCHAR(255)',
  passwordHash: 'VARCHAR(255)',
  isNotProtected: 'INT',
  isSubAccount: 'INT',
  isSubUser: 'INT',
  shouldNotSyncOnStartupAfterUpdate: 'INT',
  isSyncOnStartupRequired: 'INT',
  authTokenTTLSec: 'INT',
  isStagingBfxApi: 'INT',
  createdAt: 'BIGINT',
  updatedAt: 'BIGINT',

  [UNIQUE_INDEX_FIELD_NAME]: ['email', 'username'],
  [TRIGGER_FIELD_NAME]: [
    ...CREATE_UPDATE_API_KEYS_TRIGGERS,
    ...CREATE_UPDATE_MTS_TRIGGERS
  ]
}
