'use strict'

const {
  ProcessStateSendingError
} = require('../errors')

const { decorateInjectable } = require('../di/utils')

const depsTypes = (TYPES) => [
  TYPES.CONF,
  TYPES.DAO,
  TYPES.SyncSchema,
  TYPES.Logger,
  TYPES.Sync,
  TYPES.TABLES_NAMES
]
class ProcessMessageManager {
  constructor (
    conf,
    dao,
    syncSchema,
    logger,
    sync,
    TABLES_NAMES
  ) {
    this.conf = conf
    this.dao = dao
    this.syncSchema = syncSchema
    this.logger = logger
    this.sync = sync
    this.TABLES_NAMES = TABLES_NAMES
  }

  sendState (state, data) {
    if (
      !state ||
      typeof state !== 'string'
    ) {
      throw new ProcessStateSendingError()
    }

    const payload = (
      data &&
      typeof data === 'object'
    )
      ? { state, data }
      : { state }

    process.send(payload)
  }
}

decorateInjectable(ProcessMessageManager, depsTypes)

module.exports = ProcessMessageManager
