'use strict'

const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const {
  ObjectMappingError
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

const mapObjBySchema = (obj, schema = {}) => {
  const err = new ObjectMappingError()

  if (
    !obj ||
    typeof obj !== 'object' ||
    !schema ||
    typeof schema !== 'object'
  ) {
    throw err
  }

  const map = Array.isArray(schema)
    ? schema.map(item => [item, null])
    : Object.entries(schema)

  return map.reduce((accum, [key, val]) => {
    const _val = val && typeof val === 'string' ? val : key

    if (
      !key ||
      typeof key !== 'string' ||
      typeof obj[_val] === 'undefined'
    ) {
      throw err
    }

    accum[key] = obj[_val]

    return accum
  }, {})
}

module.exports = {
  mixUserIdToArrData,
  convertDataType,
  mapObjBySchema
}
