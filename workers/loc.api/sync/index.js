'use strict'

const SYNC_PROGRESS_STATES = require('./progress/sync.progress.states')

const {
  CollSyncPermissionError,
  SyncQueueOwnerSettingError
} = require('../errors')

const { decorateInjectable } = require('../di/utils')

const depsTypes = (TYPES) => [
  TYPES.SyncQueue,
  TYPES.RService,
  TYPES.ALLOWED_COLLS,
  TYPES.Progress,
  TYPES.RedirectRequestsToApi,
  TYPES.SyncInterrupter
]
class Sync {
  constructor (
    syncQueue,
    rService,
    ALLOWED_COLLS,
    progress,
    redirectRequestsToApi,
    syncInterrupter
  ) {
    this.syncQueue = syncQueue
    this.rService = rService
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.progress = progress
    this.redirectRequestsToApi = redirectRequestsToApi
    this.syncInterrupter = syncInterrupter
  }

  async _sync (error, params) {
    let errorForInterrupter = null
    let progressForInterrupter = this.syncInterrupter
      .INITIAL_PROGRESS

    this.progress.deactivateSyncTimeEstimate()

    if (!error) {
      try {
        this.progress.activateSyncTimeEstimate()
        progressForInterrupter = await this.syncQueue.process(params)
      } catch (err) {
        errorForInterrupter = err

        await this.progress.setProgress(err)
      }
    }

    this.progress.deactivateSyncTimeEstimate()

    try {
      await this.redirectRequestsToApi({ isRedirected: false })
    } catch (err) {
      errorForInterrupter = err

      await this.progress.setProgress(err)
    }

    if (
      this.syncInterrupter.hasInterrupted() &&
      !errorForInterrupter
    ) {
      await this.progress.setProgress(
        this.syncInterrupter.INTERRUPTED_PROGRESS
      )
    }

    const {
      progress: currProgress
    } = await this.progress.getProgress()

    if (this.syncInterrupter.hasInterrupted()) {
      this.syncInterrupter.emitInterrupted(
        errorForInterrupter,
        progressForInterrupter
      )
    }

    return currProgress
  }

  async start (params = {}) {
    const {
      isSolveAfterRedirToApi = false,
      syncColls = this.ALLOWED_COLLS.ALL,
      ownerUserId = null,
      isOwnerScheduler = false
    } = params ?? {}
    const syncParams = {
      ownerUserId,
      isOwnerScheduler
    }

    let error = null

    try {
      if (
        !Number.isInteger(ownerUserId) &&
        !isOwnerScheduler
      ) {
        throw new SyncQueueOwnerSettingError()
      }

      const isEnable = await this.rService.isSchedulerEnabled()
      const {
        isSyncInProgress
      } = await this.progress.getProgress()

      if (isEnable) {
        await this.syncQueue.add({
          syncColls,
          ownerUserId,
          isOwnerScheduler
        })
      }
      if (
        isSyncInProgress ||
        !isEnable
      ) {
        return (await this.progress.getProgress())?.progress
      }

      await this.rService.pingApi()

      await this.progress.setProgress(0)
      await this.redirectRequestsToApi({
        isRedirected: true,
        ownerUserId
      })
    } catch (err) {
      if (err instanceof CollSyncPermissionError) {
        throw err
      }

      error = err

      await this.progress.setProgress(err)
    }

    // Logs errors in the background
    if (isOwnerScheduler) {
      return this._sync(error, syncParams)
    }
    if (error) {
      const res = await this._sync(error, syncParams)

      if (error instanceof Error) {
        throw error
      }

      return res
    }
    if (isSolveAfterRedirToApi) {
      this._sync(error, syncParams).then(() => {}, () => {})

      return SYNC_PROGRESS_STATES.ACITVE_PROGRESS
    }

    return this._sync(error, syncParams)
  }

  async stop () {
    const {
      isSyncInProgress
    } = await this.progress
      .deactivateSyncTimeEstimate()
      .getProgress()

    if (isSyncInProgress) {
      return this.syncInterrupter.interrupt()
    }

    return this.syncInterrupter.INITIAL_PROGRESS
  }
}

decorateInjectable(Sync, depsTypes)

module.exports = Sync
