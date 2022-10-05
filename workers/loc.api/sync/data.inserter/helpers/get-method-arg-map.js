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
    apiKey = '',
    apiSecret = '',
    subUser
  } = reqAuth ?? {}
  const {
    apiKey: subUserApiKey,
    apiSecret: subUserApiSecret
  } = subUser ?? {}
  const auth = (
    subUserApiKey &&
    typeof subUserApiKey === 'string' &&
    subUserApiSecret &&
    typeof subUserApiSecret === 'string'
  )
    ? {
        apiKey: subUserApiKey,
        apiSecret: subUserApiSecret,
        session: reqAuth
      }
    : { apiKey, apiSecret, session: reqAuth }

  return {
    ...additionalApiCallArgs,
    auth,
    params: {
      ...additionalApiCallArgs?.params,
      ...params,
      limit,
      end,
      start
    }
  }
}
