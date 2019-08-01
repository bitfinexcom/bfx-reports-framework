'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../di/types')
const { CollSyncPermissionError } = require('../errors')

class Sync {
  constructor (
    syncQueue,
    rService,
    ALLOWED_COLLS,
    progress,
    redirectRequestsToApi
  ) {
    this.syncQueue = syncQueue
    this.rService = rService
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.progress = progress
    this.redirectRequestsToApi = redirectRequestsToApi
  }

  async _sync (isSkipSync) {
    if (!isSkipSync) {
      try {
        await this.syncQueue.process()
      } catch (err) {
        await this.progress.setProgress(err)
      }
    }

    try {
      await this.redirectRequestsToApi(false)
    } catch (err) {
      await this.progress.setProgress(err)
    }

    return this.progress.getProgress()
  }

  async start (
    isSolveAfterRedirToApi,
    syncColls = this.ALLOWED_COLLS.ALL
  ) {
    let isSkipSync = false

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
      await this.redirectRequestsToApi(true)
    } catch (err) {
      if (err instanceof CollSyncPermissionError) {
        throw err
      }

      isSkipSync = true

      await this.progress.setProgress(err)
    }

    if (!isSkipSync && isSolveAfterRedirToApi) {
      this._sync(isSkipSync).then(() => {}, () => {})

      return 'SYNCHRONIZATION_IS_STARTED'
    }

    return this._sync(isSkipSync)
  }
}

decorate(injectable(), Sync)
decorate(inject(TYPES.SyncQueue), Sync, 0)
decorate(inject(TYPES.RService), Sync, 1)
decorate(inject(TYPES.ALLOWED_COLLS), Sync, 2)
decorate(inject(TYPES.Progress), Sync, 3)
decorate(inject(TYPES.RedirectRequestsToApi), Sync, 4)

module.exports = Sync
