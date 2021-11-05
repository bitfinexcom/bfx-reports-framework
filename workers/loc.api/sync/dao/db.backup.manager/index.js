'use strict'

const { mkdirSync } = require('fs')
const { readdir } = require('fs/promises')
const path = require('path')
const moment = require('moment')

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

    return `backup_v${version}_${isoTS}.db`
  }

  async _getBackupFilesMetadata () {
    const files = await readdir(
      this._backupFolder,
      { withFileTypes: true }
    )
    const filteredFiles = files.reduce((accum, dirent) => {
      const { name } = dirent

      if (
        dirent.isFile() &&
        name.startsWith('backup') &&
        name.endsWith('.db')
      ) {
        let version = null
        let mts = 0

        const trimmedName = name.replace(/\.db$/i, '')
        const chancks = trimmedName.split('_')

        for (const chanck of chancks) {
          const momentDate = moment(chanck, moment.ISO_8601, true)

          if (/^v\d+$/i.test(chanck)) {
            const trimmedChanck = chanck.replace(/^v/i, '')
            const number = Number.parseInt(trimmedChanck)

            version = Number.isInteger(number)
              ? number
              : null
          }
          if (momentDate.isValid()) {
            mts = momentDate.valueOf()
          }
        }

        if (!Number.isInteger(version)) {
          return accum
        }

        accum.push({
          name,
          version,
          mts
        })
      }

      return accum
    }, [])

    return filteredFiles
  }
}

decorateInjectable(DBBackupManager, depsTypes)

module.exports = DBBackupManager
