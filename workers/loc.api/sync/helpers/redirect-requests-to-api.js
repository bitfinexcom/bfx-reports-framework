'use strict'

const { isEmpty } = require('lodash')

module.exports = (
  dao,
  TABLES_NAMES,
  wsEventEmitter
) => async (state = true) => {
  await dao.updateRecordOf(
    TABLES_NAMES.SYNC_MODE,
    { isEnable: !state }
  )
  await wsEventEmitter.emitRedirectingRequestsStatusToApi(
    (user) => {
      return (
        state ||
        isEmpty(user) ||
        !user.isDataFromDb
      )
    }
  )
}
