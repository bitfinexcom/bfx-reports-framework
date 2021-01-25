'use strict'

const migrationsFactory = require('./migrations-factory')
const dbMigratorFactory = require('./db-migrator-factory')
const dataInserterFactory = require('./data-inserter-factory')
const syncFactory = require('./sync-factory')

module.exports = {
  migrationsFactory,
  dbMigratorFactory,
  dataInserterFactory,
  syncFactory
}
