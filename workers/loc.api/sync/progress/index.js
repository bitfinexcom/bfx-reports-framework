'use strict'

const EventEmitter = require('events')

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
  }

  async setProgress (progress) {
    const isError = (
      progress instanceof Error ||
      (typeof progress === 'string' && /error/gi.test(progress))
    )
    const _progress = isError
      ? progress.toString()
      : progress

    try {
      await this.dao.updateRecordOf(
        this.TABLES_NAMES.PROGRESS,
        { value: JSON.stringify(_progress) }
      )
      const estimatedSyncTime = this._estimateSyncTime({
        progress: _progress
      })

      this.emit(estimatedSyncTime)
      await this.wsEventEmitter.emitProgress(() => estimatedSyncTime)
    } catch (e) {
      this.logger.error(
        `PROGRESS:SYNC:SET: ${e.stack || e}`
      )
    }

    if (isError) {
      this.logger.error(
        `PROGRESS:SYNC: ${progress.stack || progress}`
      )
    }
  }

  async getProgress () {
    const progressObj = await this.dao
      .getElemInCollBy(this.TABLES_NAMES.PROGRESS)

    const progress = typeof progressObj?.value === 'string'
      ? tryParseJSON(progressObj.value, true)
      : 'SYNCHRONIZATION_HAS_NOT_STARTED_YET'
    const estimatedSyncTime = this._estimateSyncTime({ progress })

    return estimatedSyncTime
  }

  activateSyncTimeEstimate () {
    this._syncStartedAt = Date.now()

    return this
  }

  deactivateSyncTimeEstimate () {
    this._syncStartedAt = null

    return this
  }

  async _estimateSyncTime (params) {
    const {
      progress
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

    const spentTime = nowMts - syncStartedAt

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

    const leftTime = (spentTime / progress) * (100 - progress)

    return {
      progress,
      syncStartedAt,
      spentTime,
      leftTime
    }
  }

  _getSyncStartedAt () {
    return this._syncStartedAt ?? null
  }
}

decorateInjectable(Progress, depsTypes)

module.exports = Progress
