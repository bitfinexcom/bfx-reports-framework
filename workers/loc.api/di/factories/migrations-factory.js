'use strict'

const TYPES = require('../types')

const {
  DbVersionTypeError
} = require('../../errors')

module.exports = (ctx) => {
  const { dbDriver } = ctx.container.get(
    TYPES.CONF
  )

  return (migrationsVer = []) => {
    const versions = Array.isArray(migrationsVer)
      ? migrationsVer
      : [migrationsVer]
    const depTypes = [
      TYPES.DAO,
      TYPES.TABLES_NAMES,
      TYPES.SyncSchema
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
          `../sync/dao/db-migrations/${dbDriver}-migrations/migration.v${ver}`
        )

        return new Migration(ver, ...deps)
      } catch (err) {
        return false
      }
    })

    return migrations
  }
}
