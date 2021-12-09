'use strict'

const TYPES = require('../types')

const {
  DbVersionTypeError,
  MigrationLaunchingError
} = require('../../errors')

module.exports = (ctx) => {
  const { dbDriver } = ctx.container.get(
    TYPES.CONF
  )
  const logger = ctx.container.get(
    TYPES.Logger
  )
  const processMessageManager = ctx.container.get(
    TYPES.ProcessMessageManager
  )

  const migrationsType = dbDriver === 'better-sqlite'
    ? 'sqlite'
    : dbDriver

  return (migrationsVer = []) => {
    const versions = Array.isArray(migrationsVer)
      ? migrationsVer
      : [migrationsVer]
    const depTypes = [
      TYPES.DAO,
      TYPES.TABLES_NAMES,
      TYPES.SyncSchema,
      TYPES.Logger
    ]
    const deps = depTypes.map((type) => {
      return ctx.container.get(type)
    })

    const migrations = versions.map((ver) => {
      try {
        if (!Number.isInteger(ver)) {
          throw new DbVersionTypeError()
        }

        const Migration = require(
          `../../sync/dao/db-migrations/${migrationsType}-migrations/migration.v${ver}`
        )

        return new Migration(ver, ...deps)
      } catch (err) {
        logger.debug(err)
        processMessageManager.sendState(
          processMessageManager.PROCESS_MESSAGES.ERROR_MIGRATIONS
        )

        throw new MigrationLaunchingError()
      }
    })

    return migrations
  }
}
