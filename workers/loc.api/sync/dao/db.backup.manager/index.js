'use strict'

const { mkdirSync } = require('fs')
const { readdir } = require('fs/promises')
const path = require('path')
const moment = require('moment')
const { orderBy } = require('lodash')

const { decorateInjectable } = require('../../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.CONF,
  TYPES.DAO,
  TYPES.SyncSchema,
  TYPES.Logger
]
class DBBackupManager {
  constructor (
    conf,
    dao,
    syncSchema,
    logger
  ) {
    this.conf = conf
    this.dao = dao
    this.syncSchema = syncSchema
    this.logger = logger

    this._backupFolder = path.join(
      this.conf.dbPathAbsolute,
      'backups'
    )

    this._makeBackupsFolder()
  }

  // TODO: Store only two last backup files, need to manage it
  async backupDb (params = {}) {
    const {
      currVer = await this.dao.getCurrDbVer(),
      supportedVer = this.syncSchema.SUPPORTED_DB_VERSION
    } = params ?? {}

    try {
      this.logger.debug(`[Start v${currVer} DB backup]`)

      const backupFileName = this._getBackupFileName(currVer)
      const filePath = path.join(this._backupFolder, backupFileName)

      await this.dao.backupDb({
        filePath,
        progressFn: (progress) => {
          this.logger.debug(`[DB backup progress]: ${progress}%`)
          process.send({ state: 'backup:progress', progress })
        }
      })

      this.logger.debug('[DB backup has been created successfully]')
    } catch (err) {
      this.logger.debug(`[ERR_DB_BACKUP_V${currVer}_HAS_FAILED]`)
      this.logger.error(err)

      process.send({ state: 'error:backup' })
    }
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
      const normalizedName = name.toLowerCase()

      if (
        dirent.isFile() &&
        normalizedName.startsWith('backup') &&
        normalizedName.endsWith('.db')
      ) {
        let version = null
        let mts = 0

        const trimmedName = name.replace(/\.db$/i, '')
        const chancks = trimmedName.split('_')

        for (const chanck of chancks) {
          const momentDate = moment(chanck, moment.ISO_8601)

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

        const filePath = path.join(this._backupFolder, name)

        accum.push({
          name,
          filePath,
          version,
          mts
        })
      }

      return accum
    }, [])

    const orderedFiles = orderBy(
      filteredFiles,
      ['version', 'mts'],
      ['desc', 'desc']
    )

    return orderedFiles
  }
}

decorateInjectable(DBBackupManager, depsTypes)

module.exports = DBBackupManager
