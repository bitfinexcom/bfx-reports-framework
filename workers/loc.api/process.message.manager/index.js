'use strict'

const {
  ProcessStateSendingError
} = require('../errors')

const {
  onMessage,
  sendState
} = require('./utils')
const PROCESS_STATES = require('./process.states')
const PROCESS_MESSAGES = require('./process.messages')

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
    this.PROCESS_MESSAGES = PROCESS_MESSAGES
    this.SET_PROCESS_STATES = new Set(Object.values(PROCESS_STATES))
    this.SET_PROCESS_MESSAGES = new Set(Object.values(PROCESS_MESSAGES))

    this._promisesToWait = new Map(
      [...this.SET_PROCESS_STATES].map((state) => ([state, []]))
    )

    this._mainHandler = null
  }

  init () {
    this._mainHandler = onMessage(async (err, state, data) => {
      if (!this.SET_PROCESS_STATES.has(state)) {
        return
      }
      if (typeof this[state] === 'function') {
        await this[state](err, state, data)
      }

      this._processPromise(err, state, data)
    }, this.logger)
  }

  sendState (state, data) {
    if (!this.SET_PROCESS_MESSAGES.has(state)) {
      this.logger.error(new ProcessStateSendingError())

      return false
    }

    return sendState(state, data)
  }

  onMessage (...args) {
    return onMessage(...args, this.logger)
  }

  addStateToWait (state) {
    if (!this.SET_PROCESS_STATES.has(state)) {
      throw new ProcessStateSendingError()
    }

    const promise = new Promise((resolve, reject) => {
      const queue = this._promisesToWait.get(state)

      queue.push({
        promise,
        resolve,
        reject
      })
    })

    return promise
  }

  async processState (state, data) {
    await this._mainHandler({ state, data })
  }

  _processPromise (err, state, data) {
    const queue = this._promisesToWait.get(state)

    if (
      !Array.isArray(queue) ||
      queue.length === 0
    ) {
      return
    }

    for (const [i, task] of queue.entries()) {
      const {
        resolve,
        reject
      } = task

      queue.splice(i, 1)

      if (err) {
        reject(err)

        continue
      }

      resolve(data)
    }
  }

  async [PROCESS_STATES.CLEAR_ALL_TABLES] (err, state, data) {
    if (err) {
      this.sendState(PROCESS_MESSAGES.ALL_TABLE_HAVE_NOT_BEEN_CLEARED)

      return
    }

    await this.dao.dropAllTables({
      exceptions: [
        this.TABLES_NAMES.USERS,
        this.TABLES_NAMES.SUB_ACCOUNTS
      ]
    })

    this.sendState(PROCESS_MESSAGES.ALL_TABLE_HAVE_BEEN_CLEARED)
  }

  async [PROCESS_STATES.REMOVE_ALL_TABLES] (err, state, data) {
    if (err) {
      this.sendState(PROCESS_MESSAGES.ALL_TABLE_HAVE_NOT_BEEN_REMOVED)

      return
    }

    await this.dao.disableForeignKeys()

    try {
      await this.dao.dropAllTables()
      await this.dao.setCurrDbVer(0)
    } catch (err) {
      await this.dao.enableForeignKeys()

      throw err
    }

    await this.dao.enableForeignKeys()

    this.logger.debug('[All tables have been removed]')
    this.sendState(PROCESS_MESSAGES.ALL_TABLE_HAVE_BEEN_REMOVED)
  }
}

decorateInjectable(ProcessMessageManager, depsTypes)

module.exports = ProcessMessageManager
