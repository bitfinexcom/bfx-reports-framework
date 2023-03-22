'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToModifyColumns } = require('./helpers')

const {
  ID_PRIMARY_KEY
} = require('./helpers/const')

class MigrationV33 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE users ADD COLUMN shouldNotSyncOnStartupAfterUpdate INT',
      'ALTER TABLE users ADD COLUMN isSyncOnStartupRequired INT',

      'UPDATE users SET shouldNotSyncOnStartupAfterUpdate = 0',
      'UPDATE users SET isSyncOnStartupRequired = 0'
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
        'users',
        {
          _id: ID_PRIMARY_KEY,
          id: 'BIGINT',
          email: 'VARCHAR(255)',
          apiKey: 'VARCHAR(255)',
          apiSecret: 'VARCHAR(255)',
          authToken: 'VARCHAR(255)',
          active: 'INT',
          isDataFromDb: 'INT',
          timezone: 'VARCHAR(255)',
          username: 'VARCHAR(255)',
          passwordHash: 'VARCHAR(255)',
          isNotProtected: 'INT',
          isSubAccount: 'INT',
          isSubUser: 'INT',
          createdAt: 'BIGINT',
          updatedAt: 'BIGINT'
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

module.exports = MigrationV33
