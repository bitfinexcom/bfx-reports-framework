'use strict'

const isSubAccountApiKeys = (auth = {}) => {
  const {
    apiKey,
    apiSecret
  } = { ...auth }
  const regExp = /-sub-account$/

  return (
    typeof apiKey === 'string' &&
    typeof apiSecret === 'string' &&
    regExp.test(apiKey) &&
    regExp.test(apiSecret)
  )
}

const getAuthFromSubAccountAuth = (auth = {}) => {
  const {
    apiKey: _apiKey,
    apiSecret: _apiSecret
  } = { ...auth }

  if (
    typeof apiKey !== 'string' ||
    typeof apiSecret !== 'string'
  ) {
    return auth
  }

  const regExp = /-sub-account$/

  return {
    apiKey: _apiKey.replace(regExp, ''),
    apiSecret: _apiSecret.replace(regExp, '')
  }
}

module.exports = {
  isSubAccountApiKeys,
  getAuthFromSubAccountAuth
}
