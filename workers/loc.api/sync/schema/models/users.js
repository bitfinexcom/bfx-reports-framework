'use strict'

const Model = require('./model')

module.exports = new Model({
  id: Model.BIGINT,
  email: Model.VARCHAR,
  apiKey: Model.VARCHAR,
  apiSecret: Model.VARCHAR,
  authToken: Model.VARCHAR,
  active: Model.INTEGER,
  isDataFromDb: Model.INTEGER,
  timezone: Model.VARCHAR,
  username: Model.VARCHAR,
  localUsername: Model.VARCHAR,
  passwordHash: Model.VARCHAR,
  isNotProtected: Model.INTEGER,
  isSubAccount: Model.INTEGER,
  isSubUser: Model.INTEGER,
  shouldNotSyncOnStartupAfterUpdate: Model.INTEGER,
  isSyncOnStartupRequired: Model.INTEGER,
  authTokenTTLSec: Model.INTEGER,
  isStagingBfxApi: Model.INTEGER,
  isUserMerchant: Model.INTEGER,

  [Model.UNIQUE_INDEX_FIELD_NAME]: ['email', 'username'],
  [Model.TRIGGER_FIELD_NAME]: Model.COMMON_TRIGGERS
    .CREATE_UPDATE_API_KEYS_TRIGGERS
}, { hasCreateUpdateMtsTriggers: true })
