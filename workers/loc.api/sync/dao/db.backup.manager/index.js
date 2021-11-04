'use strict'

const { decorateInjectable } = require('../../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.CONF,
  TYPES.DAO
]
class DBBackupManager {
  constructor (
    conf,
    dao
  ) {
    this.conf = conf
    this.dao = dao
  }

  // TODO:
  backupDb () {}
}

decorateInjectable(DBBackupManager, depsTypes)

module.exports = DBBackupManager
