'use strict'

const migrationsFactory = require('./migrations-factory')
const dbMigratorFactory = require('./db-migrator-factory')
const dataInserterFactory = require('./data-inserter-factory')

module.exports = {
  migrationsFactory,
  dbMigratorFactory,
  dataInserterFactory
}
