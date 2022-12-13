'use strict'

const { pick } = require('lodash')

const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const {
  isUpdatableArr,
  isUpdatableArrObj
} = require('../sync/schema/utils')

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

const pickLowerObjectsNumbers = (propName, objects = []) => {
  return objects.reduce((accum, curr) => {
    if (!Number.isFinite(curr?.[propName])) {
      return accum
    }
    if (!Number.isFinite(accum)) {
      return curr[propName]
    }

    return curr[propName] < accum
      ? curr[propName]
      : accum
  }, null)
}

const pickAllLowerObjectsNumbers = (propName, objects = []) => {
  return objects.reduce((accum, curr) => {
    if (typeof curr?.[propName] !== 'object') {
      return accum
    }

    const entries = Object.entries(curr[propName])

    return entries.reduce((accum, [key, val]) => {
      if (!Number.isFinite(val)) {
        return accum
      }
      if (!Number.isFinite(accum?.[key])) {
        accum[key] = val

        return accum
      }

      accum[key] = val < accum[key]
        ? val
        : accum[key]

      return accum
    }, accum)
  }, {})
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

const sumArrayVolumes = (propName, objects = []) => {
  return objects.reduce((accum, curr) => {
    if (!Array.isArray(curr?.[propName])) {
      return accum
    }

    for (const obj of curr[propName]) {
      if (typeof obj?.curr !== 'string') {
        continue
      }

      const entries = Object.entries(obj)
        .filter(([key]) => key !== 'curr')

      if (entries.length === 0) {
        continue
      }

      if (accum.length === 0) {
        accum.push({ ...obj })

        continue
      }

      const accumObjIndex = accum
        .findIndex((item) => item?.curr === obj.curr)

      if (accumObjIndex === -1) {
        accum.push({ ...obj })

        continue
      }

      const resObj = entries.reduce((accum, [key, vol]) => {
        const accumVol = Number.isFinite(accum?.[key])
          ? accum[key]
          : 0
        const currVol = Number.isFinite(vol)
          ? vol
          : 0

        accum[key] = accumVol + currVol

        return accum
      }, accum[accumObjIndex])

      // For right order in resulting array
      accum.splice(accumObjIndex, 1)
      accum.push(resObj)
    }

    return accum
  }, [])
}

module.exports = {
  checkParamsAuth,
  tryParseJSON,
  collObjToArr,
  getDateString,
  isNotSyncRequired,
  sumObjectsNumbers,
  pickLowerObjectsNumbers,
  sumAllObjectsNumbers,
  pickAllLowerObjectsNumbers,
  sumArrayVolumes
}
