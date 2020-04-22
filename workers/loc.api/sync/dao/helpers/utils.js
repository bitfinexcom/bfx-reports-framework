'use strict'

const { pick } = require('lodash')
const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const {
  SubAccountCreatingError
} = require('../../../errors')
const { deserializeVal } = require('./serialization')

const mixUserIdToArrData = (
  auth,
  data = []
) => {
  if (auth) {
    const { _id, subUser } = { ...auth }
    const { _id: subUserId } = { ...subUser }

    if (!Number.isInteger(_id)) {
      throw new AuthError()
    }

    const params = Number.isInteger(subUserId)
      ? { subUserId }
      : {}

    return data.map((item) => {
      return {
        ...item,
        ...params,
        user_id: _id
      }
    })
  }

  return data
}

const convertDataType = (
  arr = [],
  boolFields
) => {
  arr.forEach(obj => {
    Object.keys(obj).forEach(key => {
      if (
        obj &&
        typeof obj === 'object'
      ) {
        obj[key] = deserializeVal(
          obj[key],
          key,
          boolFields
        )
      }
    })
  })

  return arr
}

const pickUserData = (user) => {
  return {
    ...pick(
      user,
      [
        'apiKey',
        'apiSecret',
        'email',
        'timezone',
        'username',
        'id'
      ]
    )
  }
}

const checkUserId = (user = {}) => {
  const { _id } = { ...user }

  if (!Number.isInteger(_id)) {
    throw new SubAccountCreatingError()
  }
}

module.exports = {
  mixUserIdToArrData,
  convertDataType,
  pickUserData,
  checkUserId
}
