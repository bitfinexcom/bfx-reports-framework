'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToModifyColumns } = require('./helpers')

class MigrationV11 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE currencies ADD COLUMN walletFx TEXT'
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
  down () {
    const sqlArr = [
      ...getSqlArrToModifyColumns(
        'currencies',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'VARCHAR(255)',
          name: 'VARCHAR(255)',
          pool: 'VARCHAR(255)',
          explorer: 'TEXT'
        }
      )
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  afterDown () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV11
