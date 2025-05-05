'use strict'

const { cloneDeep } = require('lib-js-util-base')

const TABLES_NAMES = require('../../tables-names')
const ALLOWED_COLLS = require('../../allowed.colls')
const COLLS_TYPES = require('../../colls.types')

const {
  freezeAndSealObjectDeeply
} = require('../../helpers')

class BaseSyncSchemaModel {
  static ALLOWED_COLLS_TYPES = {
    INSERTABLE_ARRAY_OBJECTS: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
    UPDATABLE_ARRAY_OBJECTS: COLLS_TYPES.UPDATABLE_ARRAY_OBJECTS,
    UPDATABLE_ARRAY: COLLS_TYPES.UPDATABLE_ARRAY,

    PUBLIC_INSERTABLE_ARRAY_OBJECTS: COLLS_TYPES.PUBLIC_INSERTABLE_ARRAY_OBJECTS,
    PUBLIC_UPDATABLE_ARRAY_OBJECTS: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY_OBJECTS,
    PUBLIC_UPDATABLE_ARRAY: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY,

    HIDDEN_INSERTABLE_ARRAY_OBJECTS: COLLS_TYPES.HIDDEN_INSERTABLE_ARRAY_OBJECTS
  }

  static ORDERS = {
    ASC: 1,
    DESC: -1
  }

  static TABLES_NAMES = cloneDeep(TABLES_NAMES)
  static ALLOWED_COLLS = cloneDeep(ALLOWED_COLLS)
  static ALL_COLLS_TYPES = cloneDeep(COLLS_TYPES)
}

freezeAndSealObjectDeeply(
  BaseSyncSchemaModel.TABLES_NAMES,
  BaseSyncSchemaModel.ALLOWED_COLLS,
  BaseSyncSchemaModel.ALL_COLLS_TYPES,
  BaseSyncSchemaModel.ALLOWED_COLLS_TYPES,
  BaseSyncSchemaModel.ORDERS
)
Object.freeze(BaseSyncSchemaModel)

module.exports = BaseSyncSchemaModel
