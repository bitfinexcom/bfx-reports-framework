'use strict'

const { omit, cloneDeep } = require('lib-js-util-base')

const cloneSchema = (map, omittedFields = []) => {
  const arr = [...map].map(([key, schema]) => {
    const normalizedSchema = omit(schema, omittedFields)
    const clonedSchema = cloneDeep(normalizedSchema)

    for (const [propName, value] of Object.entries(schema)) {
      if (typeof value !== 'function') {
        continue
      }

      clonedSchema[propName] = value
    }

    return [key, clonedSchema]
  })

  return new Map(arr)
}

module.exports = {
  cloneSchema
}
