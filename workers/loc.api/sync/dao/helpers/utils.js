'use strict'

const { pick } = require('lodash')

const {
  SubAccountCreatingError
} = require('../../../errors')
const { deserializeVal } = require('./serialization')

const mixUserIdToArrData = async (dao, auth, data = []) => {
  if (auth) {
    const user = await dao.checkAuthInDb({ auth })

    data.forEach(item => {
      item.user_id = user._id
    })
  }
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
