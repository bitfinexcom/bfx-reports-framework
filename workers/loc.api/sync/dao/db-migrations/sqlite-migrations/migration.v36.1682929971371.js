'use strict'

/*
 * CREATED_AT: 2023-05-01T08:32:51.371Z
 * VERSION: v36
 */

const {
  ID_PRIMARY_KEY
} = require('./helpers/const')
const {
  getSqlArrToModifyColumns
} = require('./helpers')

const AbstractMigration = require('./abstract.migration')

class MigrationV36 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE currencies ADD COLUMN symbol VARCHAR(255)'
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      ...getSqlArrToModifyColumns(
        'currencies',
        {
          _id: ID_PRIMARY_KEY,
          id: 'VARCHAR(255)',
          name: 'VARCHAR(255)',
          pool: 'VARCHAR(255)',
          explorer: 'TEXT',
          walletFx: 'TEXT'
        }
      )
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  beforeDown () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  afterDown () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV36
