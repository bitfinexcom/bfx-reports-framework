'use strict'

const { cloneDeep } = require('lib-js-util-base')

const {
  SyncSchemaModelCreationError
} = require('../../../../errors')
const {
  freezeAndSealObjectDeeply
} = require('../../helpers')
const { getModelOf } = require('../../models')

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
        throw new SyncSchemaModelCreationError({
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

    // TODO:
    for (const name of BaseSyncSchemaModel.SUPPORTED_MODEL_FIELD_SET) {
      if (
        name === BaseSyncSchemaModel.MAX_LIMIT &&
        !Number.isInteger(this[name]) &&
        this[name] !== null
      ) {
        this[name] = 10_000
      }
      if (
        name === BaseSyncSchemaModel.ORDER &&
        !Array.isArray(this[name])
      ) {
        this[name] = []
      }
      if (
        name === BaseSyncSchemaModel.HAS_NEW_DATA &&
        typeof this[name] !== 'boolean'
      ) {
        this[name] = false
      }
      if (
        name === BaseSyncSchemaModel.START &&
        !Array.isArray(this[name])
      ) {
        this[name] = []
      }
      if (
        name === BaseSyncSchemaModel.IS_SYNC_REQUIRED_AT_LEAST_ONCE &&
        typeof this[name] !== 'boolean'
      ) {
        this[name] = true
      }

      if (typeof this[name] === 'undefined') {
        this[name] = null

        continue
      }

      this.#modelFields[name] = this[name]
      this.#modelFieldKeys.push(name)
    }

    this[BaseSyncSchemaModel.MODEL] = getModelOf(BaseSyncSchemaModel.NAME)

    if (isNotFrozen) {
      return
    }

    freezeAndSealObjectDeeply(this.#modelFields)
    freezeAndSealObjectDeeply(this.#modelFieldKeys)
  }

  #isNotAllowedCollName (collName) {
    return (
      BaseSyncSchemaModel.ALLOWED_COLLS
        .every((name) => name !== collName) ||
      BaseSyncSchemaModel.TABLES_NAMES
        .every((name) => name !== collName)
    )
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
  #isNotValidField (name, value) {
    if (
      name === BaseSyncSchemaModel.NAME &&
      this.#isNotAllowedCollName(value)
    ) {
      return false
    }
    if (
      name === BaseSyncSchemaModel.MAX_LIMIT &&
      !Number.isInteger(value) &&
      value !== null
    ) {
      return false
    }
    if (
      name === BaseSyncSchemaModel.DATE_FIELD_NAME &&
      typeof this[name] !== 'undefined' &&
      typeof this[name] !== 'string'
    ) {
      return false
    }
    if (
      name === BaseSyncSchemaModel.SYMBOL_FIELD_NAME &&
      typeof this[name] !== 'undefined' &&
      typeof this[name] !== 'string'
    ) {
      return false
    }
    if (
      name === BaseSyncSchemaModel.TIMEFRAME_FIELD_NAME &&
      typeof this[name] !== 'undefined' &&
      typeof this[name] !== 'string'
    ) {
      return false
    }
    if (
      name === BaseSyncSchemaModel.ORDER &&
      (
        !Array.isArray(this[name]) ||
        this[name].length === 0 ||
        this[name].some((item) => (
          !Array.isArray(item) ||
          item.length !== 2 ||
          typeof item[0] !== 'string' ||
          this.#isNotAllowedOrder(item[1])
        ))
      )
    ) {
      return false
    }
    if (
      name === BaseSyncSchemaModel.HAS_NEW_DATA &&
      typeof this[name] !== 'undefined' &&
      typeof this[name] !== 'boolean'
    ) {
      return false
    }
    if (
      name === BaseSyncSchemaModel.START &&
      typeof this[name] !== 'undefined' &&
      !Array.isArray(this[name])
    ) {
      return false
    }
    if (
      name === BaseSyncSchemaModel.IS_SYNC_REQUIRED_AT_LEAST_ONCE &&
      typeof this[name] !== 'undefined' &&
      typeof this[name] !== 'boolean'
    ) {
      return false
    }
    if (
      name === BaseSyncSchemaModel.TYPE &&
      this.#isNotAllowedCollType(value)
    ) {
      return false
    }

    return true
  }
}

module.exports = SyncSchemaModel
