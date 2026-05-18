'use strict'

const { pick } = require('@bitfinex/lib-js-util-base')

const {
  isUpdatableArr,
  isUpdatableArrObj
} = require('../../sync/schema/utils')

module.exports = (coll = [], opts) => {
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
