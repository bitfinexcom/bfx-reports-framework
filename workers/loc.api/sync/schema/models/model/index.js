'use strict'

const {
  DbModelCreationError
} = require('../../../../errors')
const {
  CREATE_UPDATE_MTS_TRIGGERS
} = require('../../common.triggers')

const BaseModel = require('./base.model')

class Model extends BaseModel {
  constructor (dataStructure, opts) {
    super()

    const {
      hasNoUID = false,
      hasCreateUpdateMtsTriggers = false
    } = opts ?? {}

    this[BaseModel.UID_FIELD_NAME] = BaseModel.ID_PRIMARY_KEY

    this.#setDataStructure(dataStructure)

    if (hasNoUID) {
      delete this[BaseModel.UID_FIELD_NAME]
    }
    if (hasCreateUpdateMtsTriggers) {
      const existingTrigers = this.#getExistingTrigers()

      this.createdAt = BaseModel.BIGINT
      this.updatedAt = BaseModel.BIGINT
      this[BaseModel.TRIGGER_FIELD_NAME] = [
        ...existingTrigers,
        ...CREATE_UPDATE_MTS_TRIGGERS
      ]
    }
  }

  #setDataStructure (dataStructure) {
    for (const [name, value] of Object.entries(dataStructure)) {
      if (
        !name ||
        typeof name !== 'string' ||
        !value ||
        (
          typeof value !== 'string' &&
          !Array.isArray(value)
        ) ||
        (
          BaseModel.ALL_DB_DATA_TYPES
            .every((type) => type !== value) &&
          BaseModel.ALL_DB_SERVICE_FIELD_NAMES
            .every((sName) => sName !== name)
        )
      ) {
        throw new DbModelCreationError({
          modelFieldName: name,
          modelFieldValue: value
        })
      }

      this[name] = value
    }
  }

  #getExistingTrigers () {
    if (Array.isArray(this[BaseModel.TRIGGER_FIELD_NAME])) {
      return this[BaseModel.TRIGGER_FIELD_NAME]
    }
    if (
      !this[BaseModel.TRIGGER_FIELD_NAME] ||
      typeof this[BaseModel.TRIGGER_FIELD_NAME] !== 'string'
    ) {
      return []
    }

    return [this[BaseModel.TRIGGER_FIELD_NAME]]
  }
}

module.exports = Model
