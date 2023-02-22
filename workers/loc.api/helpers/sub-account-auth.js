'use strict'

const SUB_ACCOUNT_API_KEYS_ENDING = '-sub-account'

const _subAccountRegExp = new RegExp(`${SUB_ACCOUNT_API_KEYS_ENDING}$`)

const isSubAccountApiKeys = (auth = {}) => {
  const {
    apiKey,
    apiSecret
  } = auth ?? {}

  return (
    typeof apiKey === 'string' &&
    typeof apiSecret === 'string' &&
    _subAccountRegExp.test(apiKey) &&
    _subAccountRegExp.test(apiSecret)
  )
}

const getAuthFromSubAccountAuth = (auth = {}) => {
  const {
    apiKey,
    apiSecret,
    authToken,
    isSubAccount
  } = auth ?? {}

  if (
    !isSubAccount &&
    authToken
  ) {
    return { authToken, isSubAccount: false }
  }
  if (
    typeof apiKey !== 'string' ||
    typeof apiSecret !== 'string'
  ) {
    return auth ?? {}
  }

  return {
    apiKey: apiKey.replace(_subAccountRegExp, ''),
    apiSecret: apiSecret.replace(_subAccountRegExp, '')
  }
}

const getSubAccountAuthFromAuth = (auth = {}) => {
  const {
    apiKey,
    apiSecret
  } = auth ?? {}

  if (
    typeof apiKey !== 'string' ||
    typeof apiSecret !== 'string' ||
    isSubAccountApiKeys(auth)
  ) {
    return auth ?? {}
  }

  return {
    apiKey: `${apiKey}${SUB_ACCOUNT_API_KEYS_ENDING}`,
    apiSecret: `${apiSecret}${SUB_ACCOUNT_API_KEYS_ENDING}`
  }
}

module.exports = {
  isSubAccountApiKeys,
  getAuthFromSubAccountAuth,
  getSubAccountAuthFromAuth
}
