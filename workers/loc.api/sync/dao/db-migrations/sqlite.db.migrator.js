'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../../di/types')

const DbMigrator = require('./db.migrator')
const {
  DbVersionTypeError
} = require('../../../errors')

class SqliteDbMigrator extends DbMigrator {
  /**
   * TODO:
   * @override
   */
  async migrateFromCurrToSupportedVer () {
    const supportedVer = this.getSupportedDbVer()
    const currVer = await this.getCurrDbVer()

    if (
      !Number.isInteger(supportedVer) ||
      !Number.isInteger(currVer)
    ) {
      throw new DbVersionTypeError()
    }
    if (currVer === supportedVer) {
      return
    }

    const isDown = currVer > supportedVer
    const versions = this.range(currVer, supportedVer)

    console.log('[migration is upped to]:'.bgGreen, versions)
    await this.migrate(versions, isDown)
  }
}

decorate(injectable(), SqliteDbMigrator)
decorate(inject(TYPES.MigrationsFactory), SqliteDbMigrator, 0)
decorate(inject(TYPES.SyncSchema), SqliteDbMigrator, 1)

module.exports = SqliteDbMigrator
