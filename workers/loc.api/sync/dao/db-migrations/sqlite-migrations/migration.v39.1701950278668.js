'use strict'

/*
 * CREATED_AT: 2023-12-07T11:57:58.668Z
 * VERSION: v39
 */

const {
  ID_PRIMARY_KEY
} = require('./helpers/const')
const {
  getSqlArrToModifyColumns
} = require('./helpers')

const AbstractMigration = require('./abstract.migration')

class MigrationV39 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE users ADD COLUMN isStagingBfxApi INT'
    ]

    this.addSql(sqlArr)
  }

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
          localUsername: 'VARCHAR(255)',
          passwordHash: 'VARCHAR(255)',
          isNotProtected: 'INT',
          isSubAccount: 'INT',
          isSubUser: 'INT',
          shouldNotSyncOnStartupAfterUpdate: 'INT',
          isSyncOnStartupRequired: 'INT',
          authTokenTTLSec: 'INT',
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
  beforeDown () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  afterDown () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV39
