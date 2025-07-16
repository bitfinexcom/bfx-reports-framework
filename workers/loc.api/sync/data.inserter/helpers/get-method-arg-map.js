'use strict'

module.exports = (
  schema,
  opts
) => {
  const {
    maxLimit = null,
    additionalApiCallArgs
  } = schema
  const {
    auth: reqAuth = {},
    limit = maxLimit,
    start = 0,
    end = Date.now(),
    params = {}
  } = opts ?? {}

  const {
    authToken,
    authTokenFn,
    apiKey = '',
    apiSecret = '',
    subUser
  } = reqAuth ?? {}
  const {
    authToken: subUserAuthToken,
    authTokenFn: subUserAuthTokenFn,
    apiKey: subUserApiKey,
    apiSecret: subUserApiSecret
  } = subUser ?? {}
  const auth = (
    (
      subUserApiKey &&
      typeof subUserApiKey === 'string' &&
      subUserApiSecret &&
      typeof subUserApiSecret === 'string'
    ) ||
    subUserAuthToken
  )
    ? {
        authToken: subUserAuthToken,
        authTokenFn: subUserAuthTokenFn,
        apiKey: subUserApiKey,
        apiSecret: subUserApiSecret,
        session: reqAuth
      }
    : { authToken, authTokenFn, apiKey, apiSecret, session: reqAuth }

  const limitParam = limit === null
    ? {}
    : { limit }
  const endParam = end === null
    ? {}
    : { end }
  const startParam = start === null
    ? {}
    : { start }

  return {
    ...additionalApiCallArgs,
    auth,
    params: {
      ...additionalApiCallArgs?.params,
      ...params,
      ...limitParam,
      ...endParam,
      ...startParam,
      isSyncRequest: true
    }
  }
}
