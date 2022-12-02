'use strict'

const _shouldNotSyncModeBeUpdated = async (deps, params) => {
  const {
    authenticator,
    syncCollsManager
  } = deps
  const {
    isRedirected = true,
    ownerUserId
  } = params ?? {}

  if (
    !isRedirected ||
    !Number.isInteger(ownerUserId)
  ) {
    return false
  }

  const auth = await authenticator.getUser(
    { _id: ownerUserId },
    { isFilledSubUsers: true }
  )
  const haveCollsBeenSyncedAtLeastOnce = await syncCollsManager
    .haveCollsBeenSyncedAtLeastOnce({ auth })

  return haveCollsBeenSyncedAtLeastOnce
}

module.exports = (
  dao,
  TABLES_NAMES,
  wsEventEmitter,
  authenticator,
  syncCollsManager
) => async (params) => {
  const {
    isRedirected = true
  } = params ?? {}
  const shouldNotSyncModeBeUpdated = await _shouldNotSyncModeBeUpdated(
    { authenticator, syncCollsManager },
    params
  )

  if (shouldNotSyncModeBeUpdated) {
    return
  }

  await dao.updateRecordOf(
    TABLES_NAMES.SYNC_MODE,
    { isEnable: !isRedirected }
  )
  await wsEventEmitter.emitRedirectingRequestsStatusToApi(
    (user) => {
      return (
        isRedirected ||
        !user?.isDataFromDb
      )
    }
  )
}
