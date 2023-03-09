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

const getAuthFromDb = async (authenticator, opts = {}) => {
  const {
    shouldGetEveryone = false,
    ownerUserId,
    isOwnerScheduler
  } = opts ?? {}
  const sessionAuth = new Map()
  const syncAuth = new Map()
  const sessions = shouldGetEveryone
    ? await authenticator.getUsers(
      { isSubAccount: true, isSubUser: false },
      { isFilledSubUsers: true }
    )
    : authenticator.getUserSessions()

  if (sessions.size === 0) {
    return { sessionAuth, syncAuth }
  }

  for (const session of sessions) {
    const user = shouldGetEveryone
      ? session
      : session[1]

    const {
      _id,
      email,
      username,
      apiKey,
      apiSecret,
      authToken,
      authTokenFn,
      isSubAccount,
      subUsers,
      token
    } = user ?? {}

    if (
      !isOwnerScheduler &&
      Number.isInteger(ownerUserId) &&
      ownerUserId !== _id
    ) {
      continue
    }

    const authPayload = {
      _id,
      email,
      apiKey,
      apiSecret,
      authToken,
      authTokenFn,
      isSubAccount,
      subUsers,
      token,
      subUser: null
    }

    if (!isSubAccount) {
      syncAuth.set(
        `${email}-${username}`,
        authPayload
      )
      sessionAuth.set(_id, user)

      continue
    }
    if (
      !Array.isArray(subUsers) ||
      subUsers.length === 0
    ) {
      continue
    }

    subUsers.forEach((subUser) => {
      const { email, username } = { ...subUser }

      syncAuth.set(
        `${email}-${username}`,
        { ...authPayload, subUser }
      )
    })

    sessionAuth.set(_id, user)
  }

  return { sessionAuth, syncAuth }
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
