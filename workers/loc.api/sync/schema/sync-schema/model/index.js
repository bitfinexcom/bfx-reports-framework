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
      throw new SyncSchemaModelCreationError()
    }

    const entries = Array.isArray(dataStructure)
      ? dataStructure
      : Object.entries(dataStructure)

    for (const [name, value] of entries) {
      if (
        !name ||
        typeof name !== 'string' ||
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
      cloneDeep(this.#modelFields),
      { isNotFrozen: true }
    )
  }

  getModelField (fieldkey) {
    if (this.#isNotAllowedModelFieldKey(fieldkey)) {
      throw new Error('ERR_MODEL_FIELD_KEY_NAME_IS_NOT_ALLOWED')
    }

    return this[this.constructor[fieldkey]]
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
      if (
        name === BaseSyncSchemaModel.SHOULD_NOT_API_MIDDLEWARE_BE_LAUNCHED &&
        typeof this[name] !== 'boolean'
      ) {
        this[name] = false
      }

      if (typeof this[name] === 'undefined') {
        this[name] = null

        continue
      }

      this.#modelFields[name] = this[name]
      this.#modelFieldKeys.push(name)
    }

    this[BaseSyncSchemaModel.MODEL] = getModelOf(this[BaseSyncSchemaModel.NAME])

    if (isNotFrozen) {
      return
    }

    freezeAndSealObjectDeeply(this.#modelFields)
    freezeAndSealObjectDeeply(this.#modelFieldKeys)
  }

  #isNotAllowedCollName (collName) {
    return (
      Object.values(BaseSyncSchemaModel.ALLOWED_COLLS)
        .every((name) => name !== collName) ||
      Object.values(BaseSyncSchemaModel.TABLES_NAMES)
        .every((name) => name !== collName)
    )
  }

  #isNotAllowedCollType (collType) {
    return Object.values(BaseSyncSchemaModel.ALLOWED_COLLS_TYPES)
      .every((type) => type !== collType)
  }

  #isNotAllowedOrder (collOrder) {
    return Object.values(BaseSyncSchemaModel.ORDERS)
      .every((order) => order !== collOrder)
  }

  #isNotAllowedConfName (confName) {
    return Object.values(BaseSyncSchemaModel.PUBLIC_COLLS_CONF_NAMES)
      .every((name) => name !== confName)
  }

  #isNotAllowedModelFieldName (fieldName) {
    return !BaseSyncSchemaModel.SUPPORTED_MODEL_FIELD_SET
      .has(fieldName)
  }

  #isNotAllowedModelFieldKey (fieldkey) {
    return !BaseSyncSchemaModel.SUPPORTED_MODEL_FIELD_KEY_SET
      .has(fieldkey)
  }

  #isNotValidField (name, value) {
    if (this.#isNotAllowedModelFieldName(name)) {
      return true
    }
    if (
      name === BaseSyncSchemaModel.NAME &&
      this.#isNotAllowedCollName(value)
    ) {
      return true
    }
    if (
      name === BaseSyncSchemaModel.MAX_LIMIT &&
      !Number.isInteger(value) &&
      value !== null
    ) {
      return true
    }
    if (
      name === BaseSyncSchemaModel.DATE_FIELD_NAME &&
      typeof value !== 'undefined' &&
      typeof value !== 'string'
    ) {
      return true
    }
    if (
      name === BaseSyncSchemaModel.SYMBOL_FIELD_NAME &&
      typeof value !== 'undefined' &&
      typeof value !== 'string'
    ) {
      return true
    }
    if (
      name === BaseSyncSchemaModel.TIMEFRAME_FIELD_NAME &&
      typeof value !== 'undefined' &&
      typeof value !== 'string'
    ) {
      return true
    }
    if (
      name === BaseSyncSchemaModel.ORDER &&
      (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.some((item) => (
          !Array.isArray(item) ||
          item.length !== 2 ||
          typeof item[0] !== 'string' ||
          this.#isNotAllowedOrder(item[1])
        ))
      )
    ) {
      return true
    }
    if (
      name === BaseSyncSchemaModel.HAS_NEW_DATA &&
      typeof value !== 'undefined' &&
      typeof value !== 'boolean'
    ) {
      return true
    }
    if (
      name === BaseSyncSchemaModel.START &&
      typeof value !== 'undefined' &&
      !Array.isArray(value)
    ) {
      return true
    }
    if (
      name === BaseSyncSchemaModel.CONF_NAME &&
      typeof value !== 'undefined' &&
      this.#isNotAllowedConfName(value)
    ) {
      return true
    }
    if (
      name === BaseSyncSchemaModel.IS_SYNC_REQUIRED_AT_LEAST_ONCE &&
      typeof value !== 'undefined' &&
      typeof value !== 'boolean'
    ) {
      return true
    }
    if (
      name === BaseSyncSchemaModel.ADDITIONAL_API_CALL_ARGS &&
      typeof value !== 'undefined' &&
      (
        !value ||
        typeof value !== 'object'
      )
    ) {
      return true
    }
    if (
      name === BaseSyncSchemaModel.TYPE &&
      this.#isNotAllowedCollType(value)
    ) {
      return true
    }
    if (
      name === BaseSyncSchemaModel.DATA_STRUCTURE_CONVERTER &&
      typeof value !== 'undefined' &&
      typeof value !== 'function'
    ) {
      return true
    }
    if (
      (
        name === BaseSyncSchemaModel.SQL_GROUP_FNS ||
        name === BaseSyncSchemaModel.SQL_GROUP_RES_BY
      ) &&
      typeof value !== 'undefined' &&
      (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.some((item) => (
          !item ||
          typeof item !== 'string'
        ))
      )
    ) {
      return true
    }
    if (
      name === BaseSyncSchemaModel.PROJECTION &&
      typeof value !== 'undefined' &&
      (
        !value ||
        typeof value !== 'string'
      ) &&
      (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.some((item) => (
          !item ||
          typeof item !== 'string'
        ))
      )
    ) {
      return true
    }
    if (
      name === BaseSyncSchemaModel.SHOULD_NOT_API_MIDDLEWARE_BE_LAUNCHED &&
      typeof value !== 'undefined' &&
      typeof value !== 'boolean'
    ) {
      return true
    }

    return false
  }
}

module.exports = SyncSchemaModel
