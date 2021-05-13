'use strict'

const DbMigrator = require('./db.migrator')
const {
  MigrationLaunchingError
} = require('../../../errors')

const { decorateInjectable } = require('../../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.MigrationsFactory,
  TYPES.TABLES_NAMES,
  TYPES.SyncSchema,
  TYPES.Logger
]
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

decorateInjectable(SqliteDbMigrator, depsTypes)

module.exports = SqliteDbMigrator
