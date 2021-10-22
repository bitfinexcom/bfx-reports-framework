'use strict'

const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const checkParamsAuth = (args) => {
  const { auth } = { ...args }
  const { apiKey, apiSecret } = { ...auth }

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

const sumAllObjectsNumbers = (propName, objects = []) => {
  return objects.reduce((accum, curr) => {
    if (typeof curr?.[propName] !== 'object') {
      return accum
    }

    const entries = Object.entries(curr[propName])

    return entries.reduce((accum, [key, val]) => {
      const prevVal = Number.isFinite(accum?.[key])
        ? accum[key]
        : 0
      const currVal = Number.isFinite(val)
        ? val
        : 0

      accum[key] = prevVal + currVal

      return accum
    }, accum)
  }, {})
}

module.exports = {
  checkParamsAuth,
  tryParseJSON,
  collObjToArr,
  getDateString,
  isNotSyncRequired,
  sumObjectsNumbers,
  sumAllObjectsNumbers
}
