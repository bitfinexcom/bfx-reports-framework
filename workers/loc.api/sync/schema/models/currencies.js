'use strict'

const {
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('../const')

module.exports = {
  _id: ID_PRIMARY_KEY,
  id: 'VARCHAR(255)',
  name: 'VARCHAR(255)',
  pool: 'VARCHAR(255)',
  explorer: 'TEXT',
  symbol: 'VARCHAR(255)',
  walletFx: 'TEXT',

  [UNIQUE_INDEX_FIELD_NAME]: ['id']
}
