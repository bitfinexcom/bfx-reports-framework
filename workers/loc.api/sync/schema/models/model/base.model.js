'use strict'

const DB_SERVICE_FIELD_NAMES = require('../../const')
const DB_DATA_TYPES = require('./db.data.types')

class BaseModel {
  static CONSTR_FIELD_NAME = DB_SERVICE_FIELD_NAMES.CONSTR_FIELD_NAME
  static TRIGGER_FIELD_NAME = DB_SERVICE_FIELD_NAMES.TRIGGER_FIELD_NAME
  static INDEX_FIELD_NAME = DB_SERVICE_FIELD_NAMES.INDEX_FIELD_NAME
  static UNIQUE_INDEX_FIELD_NAME = DB_SERVICE_FIELD_NAMES.UNIQUE_INDEX_FIELD_NAME

  static UID_FIELD_NAME = DB_SERVICE_FIELD_NAMES.UID_FIELD_NAME
  static ID_PRIMARY_KEY = DB_DATA_TYPES.ID_PRIMARY_KEY

  static BIGINT = DB_DATA_TYPES.BIGINT
  static BIGINT_NOT_NULL = DB_DATA_TYPES.BIGINT_NOT_NULL
  static INTEGER = DB_DATA_TYPES.INTEGER
  static INTEGER_NOT_NULL = DB_DATA_TYPES.INTEGER_NOT_NULL
  static DECIMAL = DB_DATA_TYPES.DECIMAL
  static DECIMAL_NOT_NULL = DB_DATA_TYPES.DECIMAL_NOT_NULL
  static VARCHAR = DB_DATA_TYPES.VARCHAR
  static VARCHAR_NOT_NULL = DB_DATA_TYPES.VARCHAR_NOT_NULL
  static TEXT = DB_DATA_TYPES.TEXT
  static TEXT_NOT_NULL = DB_DATA_TYPES.TEXT_NOT_NULL

  static ALL_DB_SERVICE_FIELD_NAMES = Object.values(DB_SERVICE_FIELD_NAMES)
  static ALL_DB_DATA_TYPES = Object.values(DB_DATA_TYPES)
}

Object.freeze(BaseModel)

module.exports = BaseModel
