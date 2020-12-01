'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../../di/types')

const DbMigrator = require('./db.migrator')
const {
  MigrationLaunchingError
} = require('../../../errors')

class SqliteDbMigrator extends DbMigrator {
  /**
   * @override
   */
  async migrateFromCurrToSupportedVer () {
    try {
      await super.migrateFromCurrToSupportedVer()
    } catch (err) {
      if (err instanceof MigrationLaunchingError) {
        await this.removeAllTables()
        this.logger.debug('[All tables have been deleted]')

        return
      }

      throw err
    }
  }

  async removeAllTables () {
    await this.dao.disableForeignKeys()

    try {
      await this.dao.dropAllTables()
      await this.dao.setCurrDbVer(0)
    } catch (err) {
      await this.dao.enableForeignKeys()

      throw err
    }

    await this.dao.enableForeignKeys()
  }
}

decorate(injectable(), SqliteDbMigrator)
decorate(inject(TYPES.MigrationsFactory), SqliteDbMigrator, 0)
decorate(inject(TYPES.TABLES_NAMES), SqliteDbMigrator, 1)
decorate(inject(TYPES.SyncSchema), SqliteDbMigrator, 2)
decorate(inject(TYPES.Logger), SqliteDbMigrator, 3)

module.exports = SqliteDbMigrator
