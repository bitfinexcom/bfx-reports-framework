'use strict'

const {
  pick
} = require('lodash')

const normalizeApiData = (
  data = [],
  model,
  cb = () => {}
) => {
  return data.map(item => {
    if (
      typeof item !== 'object' ||
      typeof model !== 'object' ||
      Object.keys(model).length === 0
    ) {
      return item
    }

    cb(item)

    return pick(item, Object.keys(model))
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
