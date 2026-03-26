'use strict'

const workerFactory = require(
  '@bitfinex/bfx-facs-db-better-sqlite/worker/worker-factory'
)
const executeAction = require('./db-worker-actions')

workerFactory(executeAction)
