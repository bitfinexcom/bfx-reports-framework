'use strict'

const { isEmpty } = require('lodash')

module.exports = (
  dao,
  TABLES_NAMES,
  wsEventEmitter
) => async ({ isRedirected = true } = {}) => {
  await dao.updateRecordOf(
    TABLES_NAMES.SYNC_MODE,
    { isEnable: !isRedirected }
  )
  await wsEventEmitter.emitRedirectingRequestsStatusToApi(
    (user) => {
      return (
        isRedirected ||
        isEmpty(user) ||
        !user.isDataFromDb
      )
    }
  )
}
