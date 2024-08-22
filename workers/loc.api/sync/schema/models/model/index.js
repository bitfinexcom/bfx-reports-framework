'use strict'

const {
  DbModelCreationError
} = require('../../../../errors')
const {
  CREATE_UPDATE_MTS_TRIGGERS
} = require('../../common.triggers')

const BaseModel = require('./base.model')

class Model extends BaseModel {
  #modelFields = {}
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
          this.#isNotDbDataType(value) &&
          this.#isNotDbServiceField(name)
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
      this.#setTriggers(CREATE_UPDATE_MTS_TRIGGERS)
    }

    this.#insertModelFields()
    /*
     * The aim here is to freeze and seal the model
     * to be immutable for security reasons
     */
    this.#freezeAndSealObjectDeeply(this)

    return this
  }

  getModelFields () {
    return this.#modelFields
  }

  getTriggers () {
    return this.#getServiceFields(BaseModel.TRIGGER_FIELD_NAME)
  }

  getConstraints () {
    return this.#getServiceFields(BaseModel.CONSTR_FIELD_NAME)
  }

  getIndexies () {
    return this.#getServiceFields(
      BaseModel.INDEX_FIELD_NAME,
      { isStringAllowed: true }
    )
  }

  getUniqueIndexies () {
    return this.#getServiceFields(
      BaseModel.UNIQUE_INDEX_FIELD_NAME,
      { isStringAllowed: true }
    )
  }

  #getServiceFields (modelFieldName, opts) {
    const { isStringAllowed } = opts ?? {}

    if (!modelFieldName) {
      throw new DbModelCreationError({
        modelFieldName
      })
    }
    if (Array.isArray(this[modelFieldName])) {
      return this[modelFieldName]
    }
    if (
      !this[modelFieldName] ||
      typeof this[modelFieldName] !== 'string'
    ) {
      return []
    }

    return isStringAllowed
      ? this[modelFieldName]
      : [this[modelFieldName]]
  }

  #setTriggers (triggers) {
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

  #insertModelFields () {
    for (const [name, value] of Object.entries(this)) {
      if (this.#isNotDbServiceField(name)) {
        this.#modelFields[name] = value
      }
    }

    this.#freezeAndSealObjectDeeply(this.#modelFields)
  }

  #freezeAndSealObjectDeeply (object) {
    if (
      !object ||
      typeof object !== 'object'
    ) {
      return
    }

    Object.freeze(object)
    Object.seal(object)

    for (const value of Object.values(object)) {
      this.#freezeAndSealObjectDeeply(value)
    }
  }

  #isNotDbServiceField (fieldName) {
    return BaseModel.ALL_DB_SERVICE_FIELD_NAMES
      .every((sName) => sName !== fieldName)
  }

  #isNotDbDataType (dbDataType) {
    return BaseModel.ALL_DB_DATA_TYPES
      .every((type) => type !== dbDataType)
  }
}

module.exports = Model
