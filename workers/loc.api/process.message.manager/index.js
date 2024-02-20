'use strict'

const {
  ProcessStateSendingError,
  DbRestoringError
} = require('../errors')

const {
  onMessage,
  offMessage,
  sendState
} = require('./utils')
const PROCESS_STATES = require('./process.states')
const PROCESS_MESSAGES = require('./process.messages')

const { decorateInjectable } = require('../di/utils')

const depsTypes = (TYPES) => [
  TYPES.Logger,
  TYPES.TABLES_NAMES
]
class ProcessMessageManager {
  constructor (
    logger,
    TABLES_NAMES
  ) {
    this.logger = logger
    this.TABLES_NAMES = TABLES_NAMES

    this.dao = null
    this.dbBackupManager = null

    this.PROCESS_STATES = PROCESS_STATES
    this.PROCESS_MESSAGES = PROCESS_MESSAGES
    this.SET_PROCESS_STATES = new Set(Object.values(PROCESS_STATES))
    this.SET_PROCESS_MESSAGES = new Set(Object.values(PROCESS_MESSAGES))

    this._promisesToWait = new Map(
      [...this.SET_PROCESS_STATES].map((state) => ([state, []]))
    )

    this._mainHandler = null

    this.isInited = false
    this.areDepsInjected = false
  }

  setDeps (
    dao,
    dbBackupManager,
    recalcSubAccountLedgersBalancesHook
  ) {
    if (this.areDepsInjected) {
      return
    }

    this.dao = dao
    this.dbBackupManager = dbBackupManager
    this.recalcSubAccountLedgersBalancesHook = recalcSubAccountLedgersBalancesHook

    this.areDepsInjected = true
  }

  init () {
    if (this.isInited) {
      return this
    }

    this._mainHandler = onMessage(async (err, state, data) => {
      if (!this.SET_PROCESS_STATES.has(state)) {
        return
      }

      this._processQueue(state, (queue) => {
        for (const [, job] of queue.entries()) {
          job.hasTriggered = true
        }
      })

      if (typeof this[state] === 'function') {
        await this[state](err, state, data)
      }

      this._processQueuePromises(state, err, data)
    }, this.logger)

    this.isInited = true

    return this
  }

  stop () {
    offMessage(this._mainHandler)
    this.isInited = false
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

  addStateToWait (state, checkHandler) {
    if (!this.SET_PROCESS_STATES.has(state)) {
      throw new ProcessStateSendingError()
    }

    const queue = this._promisesToWait.get(state)
    const job = {
      promise: null,
      index: null,
      hasTriggered: false,
      hasClosed: false,

      resolve: () => {},
      reject: () => {},
      close: (err, data) => {
        if (
          job.hasClosed ||
          (
            typeof checkHandler === 'function' &&
            !checkHandler({ err, data })
          )
        ) {
          return
        }
        if (Number.isInteger(job.index)) {
          queue.splice(job.index, 1)
          job.index = null
        }

        job.hasClosed = true

        if (err) {
          job.reject(err)

          return
        }

        job.resolve(data)
      }
    }

    job.promise = new Promise((resolve, reject) => {
      job.resolve = resolve
      job.reject = reject

      job.index = queue.push(job) - 1
    })

    return job
  }

  async processState (state, data) {
    await this._mainHandler({ state, data })
  }

  _processQueue (state, handler, params = {}) {
    const queue = this._promisesToWait.get(state)

    if (
      !Array.isArray(queue) ||
      queue.length === 0
    ) {
      return
    }

    handler(queue, params)
  }

  _processQueuePromises (state, err, data) {
    this._processQueue(state, (queue) => {
      for (const [, job] of queue.entries()) {
        const { close } = job

        if (err) {
          close(err)

          continue
        }

        close(null, data)
      }
    })
  }

  async [PROCESS_STATES.CLEAR_ALL_TABLES] (err, state, data) {
    if (err) {
      this.sendState(PROCESS_MESSAGES.ALL_TABLE_HAVE_NOT_BEEN_CLEARED)

      return
    }

    await this.dao.dropAllTables({
      shouldWalCheckpointAndVacuumBeExecuted: true,
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
      await this.dao.dropAllTables({
        shouldWalCheckpointAndVacuumBeExecuted: true
      })
      await this.dao.setCurrDbVer(0)
    } catch (err) {
      await this.dao.enableForeignKeys()

      throw err
    }

    await this.dao.enableForeignKeys()

    this.logger.debug('[All tables have been removed]')
    this.sendState(PROCESS_MESSAGES.ALL_TABLE_HAVE_BEEN_REMOVED)
  }

  async [PROCESS_STATES.BACKUP_DB] (err, state, data) {
    if (err) {
      this.logger.debug('[DB has not been backuped]:', data)
      this.logger.error(err)

      this.sendState(PROCESS_MESSAGES.ERROR_BACKUP)

      return
    }

    await this.dbBackupManager.backupDb()
  }

  async [PROCESS_STATES.PREPARE_DB] (err, state, data) {
    if (err) {
      this.logger.debug('[DB has not been prepared]:', data)
      this.logger.error(err)

      this.sendState(PROCESS_MESSAGES.DB_HAS_NOT_BEEN_PREPARED)

      return
    }

    await this.recalcSubAccountLedgersBalancesHook.execute()

    this.logger.debug('[DB has been prepared]')
    this.sendState(PROCESS_MESSAGES.DB_HAS_BEEN_PREPARED)
  }

  async [PROCESS_STATES.RESTORE_DB] (err, state, data) {
    if (err) {
      this.logger.debug('[DB has not been restored]:', data)
      this.logger.error(err)

      this.sendState(PROCESS_MESSAGES.DB_HAS_NOT_BEEN_RESTORED)

      return
    }

    const isDbRestored = await this.dbBackupManager.restoreDb(data)

    if (isDbRestored) {
      return
    }

    throw new DbRestoringError()
  }

  async [PROCESS_STATES.REQUEST_GET_BACKUP_FILES_METADATA] (err, state, data) {
    if (err) {
      this.logger.debug('[Backup files metadata have not been got]')
      this.logger.error(err)

      this.sendState(
        PROCESS_MESSAGES.RESPONSE_GET_BACKUP_FILES_METADATA,
        { err }
      )

      return
    }

    const backupFilesMetadata = await this.dbBackupManager
      .getBackupFilesMetadata()

    this.sendState(
      PROCESS_MESSAGES.RESPONSE_GET_BACKUP_FILES_METADATA,
      { backupFilesMetadata }
    )
  }

  async [PROCESS_STATES.REQUEST_UPDATE_USERS_SYNC_ON_STARTUP_REQUIRED_STATE] (err, state, data) {
    if (err) {
      this.logger.debug('[Users sync on startup required state has not been updated]')
      this.logger.error(err)

      this.sendState(
        PROCESS_MESSAGES.RESPONSE_UPDATE_USERS_SYNC_ON_STARTUP_REQUIRED_STATE,
        { err }
      )

      return
    }

    const isDone = await this.dao
      .updateUsersSyncOnStartupRequiredState()

    this.sendState(
      PROCESS_MESSAGES.RESPONSE_UPDATE_USERS_SYNC_ON_STARTUP_REQUIRED_STATE,
      { isDone }
    )
  }
}

decorateInjectable(ProcessMessageManager, depsTypes)

module.exports = ProcessMessageManager
