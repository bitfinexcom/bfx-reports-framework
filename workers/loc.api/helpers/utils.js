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

const tryParseJSON = (
  jsonString,
  isNotObject
) => {
  try {
    if (typeof jsonString !== 'string') {
      return false
    }

    const obj = JSON.parse(jsonString)

    if (
      isNotObject ||
      (
        obj &&
        typeof obj === 'object'
      )
    ) {
      return obj
    }
  } catch (e) { }

  return false
}

module.exports = {
  checkParamsAuth,
  tryParseJSON
}
