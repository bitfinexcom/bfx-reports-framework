'use strict'

const { cloneDeep } = require('lib-js-util-base')

const {
  DbModelCreationError
} = require('../../../../errors')
const {
  freezeAndSealObjectDeeply
} = require('./helpers')

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

  setDataStructure (dataStructure, opts) {
    const { isNotFrozen } = opts ?? {}

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
      this.#setTriggers(BaseModel.COMMON_TRIGGERS.CREATE_UPDATE_MTS_TRIGGERS)
    }

    this.#insertModelFields(opts)

    if (isNotFrozen) {
      return this
    }

    /*
     * The aim here is to freeze and seal the model
     * to be immutable for security reasons
     */
    freezeAndSealObjectDeeply(this)

    return this
  }

  clone () {
    return new Model().setDataStructure(
      cloneDeep(this),
      { isNotFrozen: true }
    )
  }

  getModelFields (opts) {
    return opts?.isCloned
      ? cloneDeep(this.#modelFields)
      : this.#modelFields
  }

  getTriggers (opts) {
    return this.#getServiceFields(
      BaseModel.TRIGGER_FIELD_NAME,
      { ...opts, isStringAllowed: false }
    )
  }

  getConstraints (opts) {
    return this.#getServiceFields(
      BaseModel.CONSTR_FIELD_NAME,
      { ...opts, isStringAllowed: false }
    )
  }

  getIndexies (opts) {
    return this.#getServiceFields(
      BaseModel.INDEX_FIELD_NAME,
      { ...opts, isStringAllowed: true }
    )
  }

  getUniqueIndexies (opts) {
    return this.#getServiceFields(
      BaseModel.UNIQUE_INDEX_FIELD_NAME,
      { ...opts, isStringAllowed: true }
    )
  }

  #getServiceFields (modelFieldName, opts) {
    const { isStringAllowed, isCloned } = opts ?? {}

    if (!modelFieldName) {
      throw new DbModelCreationError({
        modelFieldName
      })
    }
    if (Array.isArray(this[modelFieldName])) {
      return isCloned
        ? cloneDeep(this[modelFieldName])
        : this[modelFieldName]
    }
    if (
      !this[modelFieldName] ||
      typeof this[modelFieldName] !== 'string'
    ) {
      return []
    }

    const modelField = isStringAllowed
      ? this[modelFieldName]
      : [this[modelFieldName]]

    return isCloned
      ? cloneDeep(modelField)
      : modelField
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

  #insertModelFields (opts) {
    const { isNotFrozen } = opts ?? {}

    for (const [name, value] of Object.entries(this)) {
      if (this.#isNotDbServiceField(name)) {
        this.#modelFields[name] = value
      }
    }

    if (isNotFrozen) {
      return
    }

    freezeAndSealObjectDeeply(this.#modelFields)
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
