'use strict'

const migrationsFactory = require('./migrations-factory')
const dbMigratorFactory = require('./db-migrator-factory')
const dataInserterFactory = require('./data-inserter-factory')
const syncFactory = require('./sync-factory')
const processMessageManagerFactory = require('./process-message-manager-factory')
const syncUserStepDataFactory = require('./sync-user-step-data-factory')
const wsEventEmitterFactory = require('./ws-event-emitter-factory')

module.exports = {
  migrationsFactory,
  dbMigratorFactory,
  dataInserterFactory,
  syncFactory,
  processMessageManagerFactory,
  syncUserStepDataFactory,
  wsEventEmitterFactory
}
