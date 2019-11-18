'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../../di/types')

const DbMigration = require('./db.migration')

class SqliteDbMigration extends DbMigration {
  /**
   * @override
   */
  getCurrVersion () {}

  /**
   * TODO:
   * @override
   */
  getMigrations (versions = [1]) {
    return this.migrationsFactory(versions)
  }

  /**
   * TODO:
   * @override
   */
  async up (ver) {
    if (
      !Number.isInteger(ver) &&
      !Array.isArray(ver)
    ) {
      throw new Error('ERR_DB_MIGRATION_VERSION_IS_INCORRECT')
    }

    const versions = Array.isArray(ver)
      ? ver
      : [ver]
    const migrations = this.getMigrations(versions)

    for (const migration of migrations) {
      await migration.launch()
    }
  }

  /**
   * TODO:
   * @override
   */
  async upFromCurrToSupportedVer () {
    const supportedVer = this.getSupportedDbVer()

    console.log('[migration is upped to]:'.bgGreen, supportedVer)
    await this.up(supportedVer)
  }
}

decorate(injectable(), SqliteDbMigration)
decorate(inject(TYPES.MigrationsFactory), SqliteDbMigration, 0)
decorate(inject(TYPES.SyncSchema), SqliteDbMigration, 1)

module.exports = SqliteDbMigration
