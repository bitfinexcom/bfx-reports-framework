'use strict'

const Model = require('./model')

module.exports = new Model({
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

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['email', 'username'],
  [Model.TRIGGER_FIELD_NAME]: Model.COMMON_TRIGGERS
    .CREATE_UPDATE_API_KEYS_TRIGGERS
}, { hasCreateUpdateMtsTriggers: true })
