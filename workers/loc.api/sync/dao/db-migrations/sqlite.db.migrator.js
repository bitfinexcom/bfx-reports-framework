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
const {
  getFnArrToRemoveAllTables
} = require('./helpers')

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

        return
      }

      throw err
    }
  }

  async removeAllTables () {
    const fnArrToRemoveAllTables = await getFnArrToRemoveAllTables(
      this.dao,
      true
    )

    await this.dao.executeQueriesInTrans([
      ...fnArrToRemoveAllTables,
      () => this.dao.setCurrDbVer(0)
    ])
  }
}

decorate(injectable(), SqliteDbMigrator)
decorate(inject(TYPES.MigrationsFactory), SqliteDbMigrator, 0)
decorate(inject(TYPES.TABLES_NAMES), SqliteDbMigrator, 1)
decorate(inject(TYPES.SyncSchema), SqliteDbMigrator, 2)

module.exports = SqliteDbMigrator
