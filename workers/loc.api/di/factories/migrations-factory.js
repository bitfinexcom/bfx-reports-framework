'use strict'

const path = require('path')
const fs = require('fs')

const TYPES = require('../types')

const {
  DbVersionTypeError,
  MigrationLaunchingError
} = require('../../errors')
const {
  getMigrationFileMetadata
} = require('./helpers')

const mainMigrationFolderPath = path.join(
  __dirname,
  '../../sync/dao/db-migrations/sqlite-migrations'
)

const _getMigrationFolderPath = (migrationsType) => {
  return path.join(
    mainMigrationFolderPath,
    `${migrationsType}-migrations`
  )
}

const _lookUpMigrations = (
  migrationsType,
  migrationsVersion,
  migrationFileMetadata,
  dependencies
) => {
  return migrationFileMetadata.filter((metadata) => (
    metadata.version === migrationsVersion
  )).map((metadata) => {
    const migrationPath = path.join(
      _getMigrationFolderPath(migrationsType),
      metadata.name
    )
    const Migration = require(migrationPath)

    return new Migration(migrationsVersion, ...dependencies)
  })
}

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
      TYPES.Logger,
      TYPES.ProcessMessageManager
    ]
    const deps = depTypes.map((type) => {
      return ctx.container.get(type)
    })

    const migrationFileDirents = fs.readdirSync(
      _getMigrationFolderPath(migrationsType),
      { withFileTypes: true }
    )
    const metadata = getMigrationFileMetadata(migrationFileDirents)

    const migrations = versions.reduce((accum, ver) => {
      try {
        if (!Number.isInteger(ver)) {
          throw new DbVersionTypeError()
        }

        const migrations = _lookUpMigrations(
          migrationsType,
          metadata,
          ver,
          deps
        )

        if (migrations.length === 0) {
          throw new DbVersionTypeError()
        }

        accum.push(...migrations)

        return accum
      } catch (err) {
        logger.debug(err)
        processMessageManager.sendState(
          processMessageManager.PROCESS_MESSAGES.ERROR_MIGRATIONS
        )

        throw new MigrationLaunchingError()
      }
    }, [])

    return migrations
  }
}
