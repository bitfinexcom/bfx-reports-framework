'use strict'

const { omit, cloneDeep } = require('lib-js-util-base')
const Model = require('../models/model')

const cloneSchema = (map, omittedFields = []) => {
  const arr = [...map].map(([key, schema]) => {
    const normalizedSchema = omit(schema, omittedFields)
    const clonedSchema = {}

    for (const [propName, value] of Object.entries(normalizedSchema)) {
      if (
        typeof value === 'function' ||
        value instanceof Model
      ) {
        clonedSchema[propName] = value

        continue
      }

      clonedSchema[propName] = cloneDeep(value)
    }

    return [key, clonedSchema]
  })

  return new Map(arr)
}

const freezeAndSealObjectDeeply = (...args) => {
  for (const object of args) {
    if (
      !object ||
      typeof object !== 'object'
    ) {
      return
    }

    Object.freeze(object)
    Object.seal(object)

    for (const value of Object.values(object)) {
      freezeAndSealObjectDeeply(value)
    }
  }
}

module.exports = {
  cloneSchema,
  freezeAndSealObjectDeeply
}
