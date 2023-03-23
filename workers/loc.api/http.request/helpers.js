'use strict'

const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const isAuthApiError = (err) => {
  return /ERR_AUTH_API/.test(err.toString())
}

const makeRequestToBFX = async (requestFn) => {
  try {
    return await requestFn()
  } catch (err) {
    if (isAuthApiError(err)) {
      throw new AuthError()
    }

    throw err
  }
}

module.exports = {
  isAuthApiError,
  makeRequestToBFX
}
