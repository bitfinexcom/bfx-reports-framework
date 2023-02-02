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
    apiKey = '',
    apiSecret = '',
    subUser
  } = reqAuth ?? {}
  const {
    authToken: subUserAuthToken,
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
        apiKey: subUserApiKey,
        apiSecret: subUserApiSecret,
        session: reqAuth
      }
    : { authToken, apiKey, apiSecret, session: reqAuth }

  return {
    ...additionalApiCallArgs,
    auth,
    params: {
      ...additionalApiCallArgs?.params,
      ...params,
      limit,
      end,
      start,
      isSyncRequest: true
    }
  }
}
