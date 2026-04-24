'use strict'

const { pick } = require('@bitfinex/lib-js-util-base')

const {
  AuthError
} = require('@bitfinex/bfx-report/workers/loc.api/errors')

const {
  isUpdatableArr,
  isUpdatableArrObj
} = require('../sync/schema/utils')

const checkParamsAuth = (args) => {
  const {
    apiKey,
    apiSecret,
    authToken,
    isSubAccount
  } = args?.auth ?? {}

  if (
    !isSubAccount &&
    authToken
  ) {
    return
  }
  if (
    !apiKey ||
    typeof apiKey !== 'string' ||
    !apiSecret ||
    typeof apiSecret !== 'string'
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

const collObjToArr = (coll = [], opts) => {
  const {
    projection,
    type
  } = opts ?? {}
  const _projection = Array.isArray(projection)
    ? projection
    : [projection]
  const isProjectionExisted = (
    _projection[0] &&
    typeof _projection[0] === 'string'
  )

  const res = []

  if (isUpdatableArr(type)) {
    const fieldName = isProjectionExisted
      ? _projection[0]
      : null

    for (const obj of coll) {
      if (
        !obj ||
        typeof obj !== 'object'
      ) {
        continue
      }

      const _fieldName = fieldName ?? Object.keys(obj)
        .filter((key) => key !== '_id')[0]

      if (typeof obj?.[_fieldName] === 'undefined') {
        continue
      }

      res.push(obj?.[_fieldName])
    }
  }
  if (isUpdatableArrObj(type)) {
    if (!isProjectionExisted) {
      return coll
    }

    for (const obj of coll) {
      if (
        !obj ||
        typeof obj !== 'object'
      ) {
        continue
      }

      res.push(pick(obj, projection))
    }
  }

  return res
}

const getDateString = (mc) => {
  return new Date(mc).toDateString().split(' ').join('-')
}

const isNotSyncRequired = (args) => {
  return (
    args &&
    typeof args === 'object' &&
    args.params &&
    typeof args.params === 'object' &&
    args.params.isNotSyncRequired
  )
}

const sumObjectsNumbers = (propName, objects = []) => {
  return objects.reduce((accum, curr) => {
    return Number.isFinite(curr?.[propName])
      ? accum + curr[propName]
      : accum
  }, 0)
}

module.exports = {
  checkParamsAuth,
  tryParseJSON,
  collObjToArr,
  getDateString,
  isNotSyncRequired,
  sumObjectsNumbers
}
