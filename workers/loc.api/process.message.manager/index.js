'use strict'

const {
  onMessage,
  sendState
} = require('./utils')
const PROCESS_STATES = require('./process.states')

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

    this.PROCESS_STATES = PROCESS_STATES
    this.PROCESS_STATES_VALUES = Object.values(PROCESS_STATES)
  }

  init () {
    onMessage((err, state, data) => {
      if (
        !this.PROCESS_STATES_VALUES[state] ||
        typeof this[state] !== 'function'
      ) {
        return
      }

      this[state](err, state, data)
    }, this.logger)
  }

  sendState (...args) {
    return sendState(...args)
  }

  onMessage (...args) {
    return onMessage(...args, this.logger)
  }

  async [PROCESS_STATES.CLEAR_ALL_TABLES] (err, state, data) {
    if (err) {
      sendState('all-tables-have-not-been-cleared')

      return
    }

    await this.dao.dropAllTables({
      exceptions: [
        this.TABLES_NAMES.USERS,
        this.TABLES_NAMES.SUB_ACCOUNTS
      ]
    })
  }
}

decorateInjectable(ProcessMessageManager, depsTypes)

module.exports = ProcessMessageManager
