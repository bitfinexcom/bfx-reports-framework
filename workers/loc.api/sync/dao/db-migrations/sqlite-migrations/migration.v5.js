'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToModifyColumns } = require('./helpers')

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
      'DROP INDEX users_apiKey_apiSecret',

      ...getSqlArrToModifyColumns(
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
          passwordHash: 'VARCHAR(255)',
          isSubAccount: 'INT',
          isSubUser: 'INT',
          __constraints__: `CONSTRAINT #{tableName}_fk__id
            FOREIGN KEY (_id)
            REFERENCES subAccounts(subUserId)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
        }
      ),

      `CREATE UNIQUE INDEX users_email_username
        ON users(email, username)`
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
      'DROP INDEX users_email_username',

      ...getSqlArrToModifyColumns(
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
          username: 'VARCHAR(255)'
        }
      ),

      `CREATE UNIQUE INDEX users_apiKey_apiSecret
        ON users(apiKey, apiSecret)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  afterDown () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV5
