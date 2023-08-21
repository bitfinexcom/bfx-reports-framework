'use strict'

const EventEmitter = require('events')

const {
  isAuthError
} = require('bfx-report/workers/loc.api/helpers/api-errors-testers')

const SYNC_PROGRESS_STATES = require('./sync.progress.states')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.TABLES_NAMES,
  TYPES.WSEventEmitter,
  TYPES.Logger
]
class Progress extends EventEmitter {
  constructor (
    dao,
    TABLES_NAMES,
    wsEventEmitter,
    logger
  ) {
    super()

    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.wsEventEmitter = wsEventEmitter
    this.logger = logger

    this._availableSyncProgressStates = Object.values(SYNC_PROGRESS_STATES)

    this._syncStartedAt = null
    this._progressEmitterInterval = null
    this._progressEmitterIntervalMs = 1000
    this._error = null
    this._progress = null
    this._state = null
    this._hasNotProgressChanged = true
    this._leftTime = null
    this._prevEstimatedLeftTime = Date.now()
  }

  async setProgress (progress) {
    const isError = (
      progress instanceof Error ||
      (typeof progress === 'string' && /error/gi.test(progress))
    )
    const isFinite = Number.isFinite(progress)
    const isState = this._isState(progress)

    const error = isError
      ? progress.toString()
      : null
    const value = isFinite
      ? progress
      : null
    const state = this._getSyncProgressState(
      progress,
      isState,
      isError
    )

    this._hasNotProgressChanged = (
      (isError && this._error !== error) ||
      (isFinite && this._progress !== value) ||
      (isState && this._state !== state)
    )
    this._error = error
    this._progress = value
    this._state = state

    try {
      await this.dao.updateRecordOf(
        this.TABLES_NAMES.PROGRESS,
        {
          value,
          error,
          state
        }
      )

      await this._emitProgress()
    } catch (e) {
      this.logger.error(
        `PROGRESS:SYNC:SET: ${e.stack || e}`
      )
    }

    if (
      !isError ||
      isAuthError(progress)
    ) {
      return
    }

    this.logger.error(
      `PROGRESS:SYNC: ${progress.stack || progress}`
    )
  }

  async getProgress () {
    const storedProgress = await this.constructor
      .getNonEstimatedProgress(this.dao, this.TABLES_NAMES)
    const estimatedSyncTime = this._estimateSyncTime(storedProgress)

    return estimatedSyncTime
  }

  static async getNonEstimatedProgress (dao, TABLES_NAMES) {
    const progressObj = await dao
      .getElemInCollBy(TABLES_NAMES.PROGRESS)

    return {
      error: progressObj?.error ?? null,
      progress: progressObj?.value ?? null,
      state: progressObj?.state ?? null
    }
  }

  activateSyncTimeEstimate () {
    this._syncStartedAt = Date.now()
    this._launchProgressEmitterInterval()

    return this
  }

  deactivateSyncTimeEstimate () {
    clearInterval(this._progressEmitterInterval)
    this._syncStartedAt = null

    return this
  }

  async _estimateSyncTime (params) {
    const {
      error,
      progress,
      state,
      hasNotProgressChanged
    } = params ?? {}

    const syncStartedAt = this._getSyncStartedAt()
    const nowMts = Date.now()

    if (
      !Number.isFinite(syncStartedAt) ||
      syncStartedAt > nowMts
    ) {
      return {
        error,
        progress,
        state,
        syncStartedAt: null,
        spentTime: null,
        leftTime: null
      }
    }

    const spentTime = Math.floor(nowMts - syncStartedAt)

    if (
      !Number.isFinite(progress) ||
      progress <= 0 ||
      progress > 100
    ) {
      return {
        error,
        progress,
        state,
        syncStartedAt,
        spentTime,
        leftTime: null
      }
    }

    const leftTime = this._calcLeftTime({
      progress,
      nowMts,
      spentTime,
      hasNotProgressChanged
    })

    return {
      error,
      progress,
      state,
      syncStartedAt,
      spentTime,
      leftTime
    }
  }

  _calcLeftTime (params) {
    const {
      progress,
      nowMts,
      spentTime,
      hasNotProgressChanged
    } = params ?? {}

    if (!hasNotProgressChanged) {
      this._prevEstimatedLeftTime = nowMts
      this._leftTime = Math.floor((spentTime / progress) * (100 - progress))

      return this._leftTime
    }
    if (!Number.isFinite(this._leftTime)) {
      this._prevEstimatedLeftTime = nowMts

      return this._leftTime
    }

    const leftTime = Math.floor(this._leftTime - (nowMts - this._prevEstimatedLeftTime))
    this._prevEstimatedLeftTime = nowMts
    this._leftTime = leftTime > 0
      ? leftTime
      : null

    return this._leftTime
  }

  _getSyncStartedAt () {
    return this._syncStartedAt ?? null
  }

  _launchProgressEmitterInterval () {
    clearInterval(this._progressEmitterInterval)

    this._progressEmitterInterval = setInterval(async () => {
      await this._emitProgress({
        hasNotProgressChanged: this._hasNotProgressChanged
      })
    }, this._progressEmitterIntervalMs).unref()
  }

  async _emitProgress (opts) {
    try {
      const { hasNotProgressChanged } = opts ?? {}

      const estimatedSyncTime = this._estimateSyncTime({
        error: this._error,
        progress: this._progress,
        state: this._state,
        hasNotProgressChanged
      })

      this.emit(estimatedSyncTime)
      await this.wsEventEmitter.emitProgress(() => estimatedSyncTime)
    } catch (e) {
      this.logger.error(
        `PROGRESS:SYNC:EMITTING: ${e.stack || e}`
      )
    }
  }

  _getSyncProgressState (progress, isState, isError) {
    if (isState) {
      return progress
    }
    if (isError) {
      return null
    }

    return SYNC_PROGRESS_STATES.ACITVE_PROGRESS
  }

  _isState (state) {
    return this._availableSyncProgressStates.some((item) => (
      item === state
    ))
  }
}

decorateInjectable(Progress, depsTypes)

module.exports = Progress
