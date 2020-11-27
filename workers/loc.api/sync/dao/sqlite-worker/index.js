'use strict'

const workerFactory = require(
  'bfx-facs-db-better-sqlite/worker/worker-factory'
)
const executeAction = require('./db-worker-actions')

workerFactory(executeAction)
