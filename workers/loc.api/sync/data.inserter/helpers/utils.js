'use strict'

const {
  pick
} = require('lodash')

const normalizeApiData = (
  data = [],
  model,
  cb = () => {}
) => {
  if (
    !model ||
    typeof model !== 'object'
  ) {
    return data
  }

  const modelKeys = Object.keys(model)

  if (modelKeys.length === 0) {
    return data
  }

  return data.map((item) => {
    if (
      !item ||
      typeof item !== 'object'
    ) {
      return item
    }

    cb(item)

    return pick(item, modelKeys)
  })
}

const getAuthFromDb = (authenticator) => {
  const auth = new Map()
  const sessions = authenticator.getUserSessions()

  if (sessions.size === 0) {
    return auth
  }

  for (const [, session] of sessions) {
    const {
      _id,
      email,
      apiKey,
      apiSecret,
      isSubAccount,
      subUsers,
      token
    } = { ...session }
    const authPayload = {
      _id,
      email,
      apiKey,
      apiSecret,
      isSubAccount,
      subUsers,
      token,
      subUser: null
    }

    if (!isSubAccount) {
      auth.set(apiKey, authPayload)

      continue
    }
    if (
      !Array.isArray(subUsers) ||
      subUsers.length === 0
    ) {
      continue
    }

    subUsers.forEach((subUser) => {
      const { apiKey: subUserApiKey } = { ...subUser }

      auth.set(
        `${apiKey}-${subUserApiKey}`,
        { ...authPayload, subUser }
      )
    })
  }

  return auth
}

const getAllowedCollsNames = (allowedColls) => {
  return Object.values(allowedColls)
    .filter(name => !(/^_.*/.test(name)))
}

module.exports = {
  normalizeApiData,
  getAuthFromDb,
  getAllowedCollsNames
}
