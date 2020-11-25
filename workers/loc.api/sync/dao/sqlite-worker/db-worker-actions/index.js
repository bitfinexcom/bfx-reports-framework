'use strict'

const dbWorkerActions = require(
  'bfx-facs-db-better-sqlite/worker/db-worker-actions'
)

const DB_WORKER_ACTIONS = require('./db-worker-actions.const')
const ACTIONS_MAP = {
  [DB_WORKER_ACTIONS.RUN_IN_TRANS]: require('./action-run-in-trans'),
  [DB_WORKER_ACTIONS.UPDATE_RECORD_OF]: require('./action-update-record-of'),
  [DB_WORKER_ACTIONS.GET_USERS]: require('./action-get-users')
}

module.exports = (db, args) => {
  const { action, sql, params } = args

  if (ACTIONS_MAP[action]) {
    return ACTIONS_MAP[action](db, sql, params)
  }

  return dbWorkerActions(db, args)
}
