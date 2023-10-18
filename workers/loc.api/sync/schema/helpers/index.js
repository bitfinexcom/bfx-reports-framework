'use strict'

const { omit, cloneDeep } = require('lib-js-util-base')

const {
  CONSTR_FIELD_NAME,
  TRIGGER_FIELD_NAME,
  INDEX_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME
} = require('../const')

const cloneSchema = (map, omittedFields = []) => {
  const arr = [...map].map(([key, schema]) => {
    const normalizedSchema = omit(schema, omittedFields)
    const clonedSchema = cloneDeep(normalizedSchema)

    return [key, clonedSchema]
  })

  return new Map(arr)
}

const getModelsMap = (params = {}) => {
  const {
    models,
    omittedFields = [
      CONSTR_FIELD_NAME,
      TRIGGER_FIELD_NAME,
      INDEX_FIELD_NAME,
      UNIQUE_INDEX_FIELD_NAME
    ]
  } = { ...params }

  return cloneSchema(models, omittedFields)
}

const getModelOf = (tableName, models) => {
  return { ...getModelsMap({ models }).get(tableName) }
}

module.exports = {
  cloneSchema,
  getModelsMap,
  getModelOf
}
