'use strict'

const TYPES = require('../types')

module.exports = (ctx) => {
  const { dbDriver } = ctx.get(
    TYPES.CONF
  )

  return () => {
    const dao = ctx.get(
      TYPES.DAO
    )

    if (dbDriver === 'better-sqlite') {
      const sqliteDbMigrator = ctx.get(
        TYPES.SqliteDbMigrator
      )
      sqliteDbMigrator.setDao(dao)

      return sqliteDbMigrator
    }
  }
}
