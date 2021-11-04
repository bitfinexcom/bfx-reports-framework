'use strict'

// const { promisify } = require('util')
const { mkdirSync } = require('fs')
const path = require('path')

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

    this._backupFolder = path.join(
      this.conf.dbPathAbsolute,
      'backups'
    )

    this._makeBackupsFolder()
  }

  _makeBackupsFolder () {
    mkdirSync(this._backupFolder, { recursive: true })
  }

  // TODO:
  backupDb () {}
}

decorateInjectable(DBBackupManager, depsTypes)

module.exports = DBBackupManager
