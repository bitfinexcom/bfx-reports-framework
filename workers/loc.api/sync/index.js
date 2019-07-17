'use strict'

const { CollSyncPermissionError } = require('../errors')

const _syncFactory = (
  syncQueue,
  progress,
  redirectRequestsToApi
) => async (isSkipSync) => {
  if (!isSkipSync) {
    try {
      await syncQueue.process()
    } catch (err) {
      await progress.setProgress(err)
    }
  }

  try {
    await redirectRequestsToApi(false)
  } catch (err) {
    await progress.setProgress(err)
  }

  return progress.getProgress()
}

module.exports = (
  syncQueue,
  rService,
  ALLOWED_COLLS,
  progress,
  redirectRequestsToApi
) => async (
  isSolveAfterRedirToApi,
  syncColls = ALLOWED_COLLS.ALL
) => {
  const sync = _syncFactory(
    syncQueue,
    progress,
    redirectRequestsToApi
  )

  let isSkipSync = false

  try {
    const isEnable = await rService.isSchedulerEnabled()
    const currProgress = await progress.getProgress()

    if (isEnable) {
      await syncQueue.add(syncColls)
    }
    if (
      (currProgress < 100) ||
      !isEnable
    ) {
      return progress.getProgress()
    }

    await rService.pingApi()

    await progress.setProgress(0)
    await redirectRequestsToApi(true)
  } catch (err) {
    if (err instanceof CollSyncPermissionError) {
      throw err
    }

    isSkipSync = true

    await progress.setProgress(err)
  }

  if (!isSkipSync && isSolveAfterRedirToApi) {
    sync(isSkipSync).then(() => {}, () => {})

    return 'SYNCHRONIZATION_IS_STARTED'
  }

  return sync(isSkipSync)
}
