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
  TYPES.Logger,
  TYPES.DBBackupManager,
  TYPES.ProcessMessageManager
]
class SqliteDbMigrator extends DbMigrator {
  /**
   * @override
   */
  async migrateFromCurrToSupportedVer () {
    try {
      await super.migrateFromCurrToSupportedVer()
    } catch (err) {
      if (!(err instanceof MigrationLaunchingError)) {
        throw err
      }

      const { promise: responsePromise } = this.processMessageManager.addStateToWait(
        this.processMessageManager.PROCESS_STATES.RESPONSE_MIGRATION_HAS_FAILED_WHAT_SHOULD_BE_DONE
      )
      this.processMessageManager.sendState(
        this.processMessageManager.PROCESS_MESSAGES.REQUEST_MIGRATION_HAS_FAILED_WHAT_SHOULD_BE_DONE
      )
      const {
        shouldRestore = false,
        shouldRemove = false
      } = (await responsePromise) ?? {}

      if (shouldRestore) {
        const isDbRestored = await this.dbBackupManager.restoreDb()

        if (isDbRestored) {
          return
        }

        const { promise: rmDbPromise } = this.processMessageManager.addStateToWait(
          this.processMessageManager.PROCESS_STATES.REMOVE_ALL_TABLES
        )
        this.processMessageManager.sendState(
          this.processMessageManager.PROCESS_MESSAGES.REQUEST_SHOULD_ALL_TABLES_BE_REMOVED,
          { isNotDbRestored: !isDbRestored }
        )

        await rmDbPromise

        return
      }
      if (shouldRemove) {
        await this.processMessageManager.processState(
          this.processMessageManager.PROCESS_STATES.REMOVE_ALL_TABLES
        )

        return
      }

      throw err
    }
  }
}

decorateInjectable(SqliteDbMigrator, depsTypes)

module.exports = SqliteDbMigrator
