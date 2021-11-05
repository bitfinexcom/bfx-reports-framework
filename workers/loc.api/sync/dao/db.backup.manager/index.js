'use strict'

const { mkdirSync } = require('fs')
const path = require('path')

const { decorateInjectable } = require('../../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.CONF,
  TYPES.DAO,
  TYPES.SyncSchema
]
class DBBackupManager {
  constructor (
    conf,
    dao,
    syncSchema
  ) {
    this.conf = conf
    this.dao = dao
    this.syncSchema = syncSchema

    this._backupFolder = path.join(
      this.conf.dbPathAbsolute,
      'backups'
    )

    this._makeBackupsFolder()
  }

  // TODO:
  async backupDb (params = {}) {
    const {
      currVer = await this.dao.getCurrDbVer(),
      supportedVer = this.syncSchema.SUPPORTED_DB_VERSION
    } = params ?? {}
  }

  _makeBackupsFolder () {
    mkdirSync(this._backupFolder, { recursive: true })
  }

  _getBackupFileName (version, mts) {
    const isoTS = Number.isInteger(mts)
      ? new Date(mts).toISOString()
      : new Date().toISOString()

    return `backup-v${version}-${isoTS}.db`
  }
}

decorateInjectable(DBBackupManager, depsTypes)

module.exports = DBBackupManager
