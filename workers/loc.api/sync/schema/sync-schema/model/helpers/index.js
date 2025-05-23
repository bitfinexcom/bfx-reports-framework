'use strict'

const { cloneDeep } = require('lib-js-util-base')
const BaseSyncSchemaModel = require(
  '../base.sync.schema.model'
)

const cloneModel = (model = []) => {
  const clonedSchema = {}

  for (const [propName, value] of Object.entries(model)) {
    if (propName === BaseSyncSchemaModel.MODEL) {
      continue
    }
    if (
      typeof value === 'function'
    ) {
      clonedSchema[propName] = value

      continue
    }

    clonedSchema[propName] = cloneDeep(value)
  }

  return clonedSchema
}

module.exports = {
  cloneModel
}
