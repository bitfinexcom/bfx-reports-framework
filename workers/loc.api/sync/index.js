'use strict'

const { CollSyncPermissionError } = require('../errors')

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

  async _sync (error) {
    let errorForInterrupter = null
    let progressForInterrupter = this.syncInterrupter
      .INITIAL_PROGRESS

    if (!error) {
      try {
        progressForInterrupter = await this.syncQueue.process()
      } catch (err) {
        errorForInterrupter = err

        await this.progress.setProgress(err)
      }
    }

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

    const currProgress = await this.progress.getProgress()

    if (this.syncInterrupter.hasInterrupted()) {
      this.syncInterrupter.emitInterrupted(
        errorForInterrupter,
        progressForInterrupter
      )
    }

    return currProgress
  }

  async start (
    isSolveAfterRedirToApi,
    syncColls = this.ALLOWED_COLLS.ALL
  ) {
    let error = null

    try {
      const isEnable = await this.rService.isSchedulerEnabled()
      const currProgress = await this.progress.getProgress()

      if (isEnable) {
        await this.syncQueue.add(syncColls)
      }
      if (
        (currProgress < 100) ||
        !isEnable
      ) {
        return this.progress.getProgress()
      }

      await this.rService.pingApi()

      await this.progress.setProgress(0)
      await this.redirectRequestsToApi({ isRedirected: true })
    } catch (err) {
      if (err instanceof CollSyncPermissionError) {
        throw err
      }

      error = err

      await this.progress.setProgress(err)
    }

    if (!error && isSolveAfterRedirToApi) {
      this._sync(error).then(() => {}, () => {})

      return 'SYNCHRONIZATION_IS_STARTED'
    }

    return this._sync(error)
  }

  async stop () {
    const currProgress = await this.progress.getProgress()

    if (currProgress < 100) {
      return this.syncInterrupter.interrupt()
    }

    return this.syncInterrupter.INITIAL_PROGRESS
  }
}

decorateInjectable(Sync, depsTypes)

module.exports = Sync
