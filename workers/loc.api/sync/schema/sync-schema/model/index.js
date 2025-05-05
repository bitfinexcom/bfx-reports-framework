'use strict'

const { cloneDeep } = require('lib-js-util-base')

const {
  freezeAndSealObjectDeeply
} = require('../../helpers')

const BaseSyncSchemaModel = require('./base.sync.schema.model')

class SyncSchemaModel extends BaseSyncSchemaModel {
  #modelFields = {}
  #modelFieldKeys = []

  constructor (dataStructure) {
    super()

    this.setDataStructure(dataStructure)
  }

  setDataStructure (dataStructure, opts) {
    const { isNotFrozen } = opts ?? {}

    if (!dataStructure) {
      return this
    }
    if (typeof dataStructure !== 'object') {
      throw new Error()
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
        this.#isNotValidField(name, value)
      ) {
        throw new Error({
          modelFieldName: name,
          modelFieldValue: value
        })
      }

      this[name] = value
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
    return new SyncSchemaModel().setDataStructure(
      cloneDeep(this),
      { isNotFrozen: true }
    )
  }

  getModelFields (opts) {
    return opts?.isCloned
      ? cloneDeep(this.#modelFields)
      : this.#modelFields
  }

  getModelFieldKeys (opts) {
    return opts?.isCloned
      ? cloneDeep(this.#modelFieldKeys)
      : this.#modelFieldKeys
  }

  hasModelFieldName (fieldName) {
    return !!this.#modelFields[fieldName]
  }

  #insertModelFields (opts) {
    const { isNotFrozen } = opts ?? {}

    if (isNotFrozen) {
      return
    }

    freezeAndSealObjectDeeply(this.#modelFields)
    freezeAndSealObjectDeeply(this.#modelFieldKeys)
  }

  #isNotAllowedCollType (collType) {
    return BaseSyncSchemaModel.ALLOWED_COLLS_TYPES
      .every((type) => type !== collType)
  }

  #isNotAllowedOrder (collOrder) {
    return BaseSyncSchemaModel.ORDERS
      .every((order) => order !== collOrder)
  }

  // TODO:
  #isNotValidField (name, value) {}
}

module.exports = SyncSchemaModel
