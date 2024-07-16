'use strict'

const {
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('../const')

module.exports = {
  _id: ID_PRIMARY_KEY,
  key: 'VARCHAR(255)',
  value: 'VARCHAR(255)',

  [UNIQUE_INDEX_FIELD_NAME]: ['key']
}
