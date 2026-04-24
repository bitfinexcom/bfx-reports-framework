'use strict'

const {
  AuthError
} = require('@bitfinex/bfx-report/workers/loc.api/errors')

const checkParamsAuth = (args) => {
  const {
    apiKey,
    apiSecret,
    authToken,
    isSubAccount
  } = args?.auth ?? {}

  if (
    !isSubAccount &&
    authToken
  ) {
    return
  }
  if (
    !apiKey ||
    typeof apiKey !== 'string' ||
    !apiSecret ||
    typeof apiSecret !== 'string'
  ) {
    throw new AuthError()
  }
}

module.exports = {
  checkParamsAuth
}
