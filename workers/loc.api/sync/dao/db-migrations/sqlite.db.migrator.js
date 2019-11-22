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
      return () => this.dao.dropTable(name, true)
    })

    if (sqlArr.length === 0) {
      return
    }

    await this.dao.executeQueriesInTrans([
      () => this.dao.disableForeignKeys(),
      ...sqlArr,
      () => this.dao.enableForeignKeys(),
      () => this.dao.setCurrDbVer(0)
    ])
  }
}

decorate(injectable(), SqliteDbMigrator)
decorate(inject(TYPES.MigrationsFactory), SqliteDbMigrator, 0)
decorate(inject(TYPES.TABLES_NAMES), SqliteDbMigrator, 1)
decorate(inject(TYPES.SyncSchema), SqliteDbMigrator, 2)

module.exports = SqliteDbMigrator
