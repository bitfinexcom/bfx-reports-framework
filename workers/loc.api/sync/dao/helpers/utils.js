'use strict'

const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const {
  ObjectMappingError
} = require('../../../errors')

const mixUserIdToArrData = (
  auth,
  data = []
) => {
  const isArray = Array.isArray(data)
  const _data = isArray ? data : [data]

  if (auth) {
    const { _id, subUser } = { ...auth }
    const { _id: subUserId } = { ...subUser }

    if (!Number.isInteger(_id)) {
      throw new AuthError()
    }

    for (const obj of _data) {
      if (
        !obj ||
        typeof obj !== 'object'
      ) {
        continue
      }
      if (Number.isInteger(subUserId)) {
        obj.subUserId = subUserId
      }

      obj.user_id = _id
    }
  }

  return isArray ? _data : _data[0]
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

const isContainedSameMts = (
  res,
  dateFieldName,
  limit
) => {
  if (!Array.isArray(res)) {
    return false
  }

  return (
    res.length >= 2 &&
    (
      !Number.isInteger(limit) ||
      res.length === limit
    ) &&
    Number.isInteger(res[res.length - 1][dateFieldName]) &&
    Number.isInteger(res[res.length - 2][dateFieldName]) &&
    res[res.length - 1][dateFieldName] === res[res.length - 2][dateFieldName]
  )
}

module.exports = {
  mixUserIdToArrData,
  mapObjBySchema,
  isContainedSameMts
}
