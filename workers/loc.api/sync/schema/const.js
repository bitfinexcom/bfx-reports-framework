'use strict'

const CONSTR_FIELD_NAME = '__constraints__'
const TRIGGER_FIELD_NAME = '__triggers__'
const INDEX_FIELD_NAME = '__indexies__'
const UNIQUE_INDEX_FIELD_NAME = '__uniqueIndexies__'
const ID_PRIMARY_KEY = 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT'

module.exports = {
  CONSTR_FIELD_NAME,
  TRIGGER_FIELD_NAME,
  INDEX_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
}
