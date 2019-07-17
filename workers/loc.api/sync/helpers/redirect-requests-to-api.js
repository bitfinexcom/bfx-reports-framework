'use strict'

const { isEmpty } = require('lodash')

module.exports = (
  dao,
  wsEventEmitter
) => async (state = true) => {
  await dao.updateStateOf('syncMode', !state)
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
