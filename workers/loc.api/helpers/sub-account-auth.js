'use strict'

const SUB_ACCOUNT_API_KEYS_ENDING = '-sub-account'

const _subAccountRegExp = new RegExp(`${SUB_ACCOUNT_API_KEYS_ENDING}$`)

const isSubAccountApiKeys = (auth = {}) => {
  const {
    apiKey,
    apiSecret
  } = { ...auth }

  return (
    typeof apiKey === 'string' &&
    typeof apiSecret === 'string' &&
    _subAccountRegExp.test(apiKey) &&
    _subAccountRegExp.test(apiSecret)
  )
}

const getAuthFromSubAccountAuth = (auth = {}) => {
  const {
    apiKey: _apiKey,
    apiSecret: _apiSecret
  } = { ...auth }

  if (
    typeof _apiKey !== 'string' ||
    typeof _apiSecret !== 'string'
  ) {
    return auth
  }

  return {
    apiKey: _apiKey.replace(_subAccountRegExp, ''),
    apiSecret: _apiSecret.replace(_subAccountRegExp, '')
  }
}

const getSubAccountAuthFromAuth = (auth = {}) => {
  const {
    apiKey: _apiKey,
    apiSecret: _apiSecret
  } = { ...auth }

  if (
    typeof _apiKey !== 'string' ||
    typeof _apiSecret !== 'string' ||
    isSubAccountApiKeys(auth)
  ) {
    return auth
  }

  return {
    apiKey: `${_apiKey}${SUB_ACCOUNT_API_KEYS_ENDING}`,
    apiSecret: `${_apiSecret}${SUB_ACCOUNT_API_KEYS_ENDING}`
  }
}

const filterSubUsers = (
  subUsers = [],
  user = {}
) => {
  if (
    !Array.isArray(subUsers) ||
    subUsers.length === 0
  ) {
    return []
  }

  return subUsers.filter((subUser) => {
    const {
      apiKey,
      apiSecret
    } = { ...subUser }
    const {
      apiKey: userApiKey,
      apiSecret: userApiSecret
    } = { ...user }

    return (
      apiKey !== userApiKey &&
      apiSecret !== userApiSecret
    )
  })
}

module.exports = {
  isSubAccountApiKeys,
  getAuthFromSubAccountAuth,
  getSubAccountAuthFromAuth,
  filterSubUsers
}
