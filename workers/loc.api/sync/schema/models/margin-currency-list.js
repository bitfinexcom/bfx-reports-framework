'use strict'

const {
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('./model/db.service.field.names')

module.exports = {
  _id: ID_PRIMARY_KEY,
  symbol: 'VARCHAR(255)',

  [UNIQUE_INDEX_FIELD_NAME]: ['symbol']
}
