'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToRemoveColumns } = require('./helpers')

class MigrationV5 extends AbstractMigration {
  /**
   * @override
   */
  beforeUp () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE users ADD COLUMN passwordHash VARCHAR(255)'
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  afterUp () { return this.dao.enableForeignKeys() }

  /**
   * @override
   */
  beforeDown () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      ...getSqlArrToRemoveColumns(
        'users',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'BIGINT',
          email: 'VARCHAR(255)',
          apiKey: 'VARCHAR(255) NOT NULL',
          apiSecret: 'VARCHAR(255) NOT NULL',
          active: 'INT',
          isDataFromDb: 'INT',
          timezone: 'VARCHAR(255)',
          username: 'VARCHAR(255)',
          passwordHash: 'VARCHAR(255)'
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

module.exports = MigrationV5
