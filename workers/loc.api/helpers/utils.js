'use strict'

const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const {
  ObjectMappingError
} = require('../errors')

const checkParamsAuth = (args) => {
  if (
    !args.auth ||
    typeof args.auth !== 'object' ||
    typeof args.auth.apiKey !== 'string' ||
    typeof args.auth.apiSecret !== 'string'
  ) {
    throw new AuthError()
  }
}

const tryParseJSON = (
  jsonString,
  isNotObject
) => {
  try {
    if (typeof jsonString !== 'string') {
      return false
    }

    const obj = JSON.parse(jsonString)

    if (
      isNotObject ||
      (
        obj &&
        typeof obj === 'object'
      )
    ) {
      return obj
    }
  } catch (e) { }

  return false
}

const collObjToArr = (coll = [], fieldName) => {
  const res = []

  coll.forEach(obj => {
    if (
      typeof obj === 'object' &&
      typeof obj[fieldName] !== 'undefined'
    ) {
      res.push(obj[fieldName])
    }
  })

  return res
}

const refreshObj = (
  oldObj,
  newObj,
  currObj,
  props = []
) => {
  props.forEach(prop => {
    if (
      currObj[prop] &&
      oldObj[prop] !== currObj[prop]
    ) {
      newObj[prop] = currObj[prop]
    }
  })
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
  checkParamsAuth,
  tryParseJSON,
  collObjToArr,
  refreshObj,
  mapObjBySchema
}
