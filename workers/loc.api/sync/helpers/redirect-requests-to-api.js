'use strict'

const { isEmpty } = require('lodash')

module.exports = (
  dao,
  TABLES_NAMES,
  wsEventEmitter
) => async ({
  isRedirected = true,
  isAuthSpecified = false,
  auth
}) => {
  if (isAuthSpecified) {
    await dao.updateRecordOf(
      TABLES_NAMES.SYNC_MODE,
      { isEnable: !isRedirected }
    )
  }

  await wsEventEmitter.emitRedirectingRequestsStatusToApi(
    (user) => {
      if (
        isAuthSpecified &&
        wsEventEmitter.isInvalidAuth(auth, user)
      ) {
        return null
      }

      return (
        isRedirected ||
        isEmpty(user) ||
        !user.isDataFromDb
      )
    }
  )
}
