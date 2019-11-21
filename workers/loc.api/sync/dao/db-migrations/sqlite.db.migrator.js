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
        await this.removeAllTable()

        return
      }

      throw err
    }
  }

  async removeAllTable () {
    const tablesNames = await this.dao.getTablesNames()
    const sqlArr = tablesNames.map((name) => {
      return `DROP TABLE IF EXISTS ${name}`
    })

    if (sqlArr.length === 0) {
      return
    }

    await this.dao.executeQueriesInTrans([
      'PRAGMA foreign_keys = OFF',
      ...sqlArr,
      'PRAGMA foreign_keys = ON'
    ])
  }
}

decorate(injectable(), SqliteDbMigrator)
decorate(inject(TYPES.MigrationsFactory), SqliteDbMigrator, 0)
decorate(inject(TYPES.TABLES_NAMES), SqliteDbMigrator, 1)
decorate(inject(TYPES.SyncSchema), SqliteDbMigrator, 2)

module.exports = SqliteDbMigrator
