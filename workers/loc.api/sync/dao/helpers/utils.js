'use strict'

const { pick } = require('lodash')

const {
  SubAccountCreatingError
} = require('../../../errors')
const { deserializeVal } = require('./serialization')

const mixUserIdToArrData = async (dao, auth, data = []) => {
  if (auth) {
    const { subUser } = { ...auth }
    const { _id: subUserId } = { ...subUser }
    const { _id } = await dao.checkAuthInDb({ auth })
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
