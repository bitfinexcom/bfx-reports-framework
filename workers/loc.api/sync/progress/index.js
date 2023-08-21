'use strict'

const EventEmitter = require('events')

const {
  isAuthError
} = require('bfx-report/workers/loc.api/helpers/api-errors-testers')

const SYNC_PROGRESS_STATES = require('./sync.progress.states')
const {
  tryParseJSON
} = require('../../helpers')

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

    this._syncStartedAt = null
    this._progressEmitterInterval = null
    this._progressEmitterIntervalMs = 1000
    this._progress = null
    this._hasNotProgressChanged = true
    this._leftTime = null
    this._prevEstimatedLeftTime = Date.now()
  }

  async setProgress (progress) {
    const isError = (
      progress instanceof Error ||
      (typeof progress === 'string' && /error/gi.test(progress))
    )
    const _progress = isError
      ? progress.toString()
      : progress
    this._hasNotProgressChanged = this._progress !== _progress
    this._progress = _progress

    try {
      await this.dao.updateRecordOf(
        this.TABLES_NAMES.PROGRESS,
        { value: JSON.stringify(_progress) }
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
    const progress = await this.constructor
      .getNonEstimatedProgress(this.dao, this.TABLES_NAMES)
    const estimatedSyncTime = this._estimateSyncTime({ progress })

    return estimatedSyncTime
  }

  static async getNonEstimatedProgress (dao, TABLES_NAMES) {
    const progressObj = await dao
      .getElemInCollBy(TABLES_NAMES.PROGRESS)

    const progress = typeof progressObj?.value === 'string'
      ? tryParseJSON(progressObj.value, true)
      : SYNC_PROGRESS_STATES.INITIAL_PROGRESS

    return progress
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
      progress,
      hasNotProgressChanged
    } = params ?? {}

    const syncStartedAt = this._getSyncStartedAt()
    const nowMts = Date.now()

    if (
      !Number.isFinite(syncStartedAt) ||
      syncStartedAt > nowMts
    ) {
      return {
        progress,
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
        progress,
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
      progress,
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
        progress: this._progress,
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
}

decorateInjectable(Progress, depsTypes)

module.exports = Progress
