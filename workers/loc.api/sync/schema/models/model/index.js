'use strict'

const {
  DbModelCreationError
} = require('../../../../errors')
const {
  CREATE_UPDATE_MTS_TRIGGERS
} = require('../../common.triggers')

const BaseModel = require('./base.model')

class Model extends BaseModel {
  #opts = {
    hasNoUID: false,
    hasCreateUpdateMtsTriggers: false
  }

  constructor (dataStructure, opts) {
    super()

    this.#opts = opts ?? this.#opts ?? {}

    this[BaseModel.UID_FIELD_NAME] = BaseModel.ID_PRIMARY_KEY

    this.setDataStructure(dataStructure)
  }

  setDataStructure (dataStructure) {
    if (!dataStructure) {
      return this
    }
    if (typeof dataStructure !== 'object') {
      throw new DbModelCreationError()
    }

    const entries = Array.isArray(dataStructure)
      ? dataStructure
      : Object.entries(dataStructure)

    for (const [name, value] of entries) {
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

    if (this.#opts.hasNoUID) {
      delete this[BaseModel.UID_FIELD_NAME]
    }
    if (this.#opts.hasCreateUpdateMtsTriggers) {
      this.createdAt = BaseModel.BIGINT
      this.updatedAt = BaseModel.BIGINT
      this.setTriggers(CREATE_UPDATE_MTS_TRIGGERS)
    }

    return this
  }

  getTriggers () {
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

  setTriggers (triggers) {
    if (!triggers) {
      return this
    }

    const newTriggers = Array.isArray(triggers)
      ? triggers
      : [triggers]

    for (const trigger of newTriggers) {
      if (
        trigger &&
        typeof trigger === 'string'
      ) {
        continue
      }

      throw new DbModelCreationError({
        modelFieldName: BaseModel.TRIGGER_FIELD_NAME,
        modelFieldValue: trigger
      })
    }

    const existingTriggers = this.getTriggers()

    this[BaseModel.TRIGGER_FIELD_NAME] = [
      ...existingTriggers,
      ...newTriggers
    ]

    return this
  }
}

module.exports = Model
