'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToModifyColumns } = require('./helpers')

const ID_PRIMARY_KEY = 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT'
const CREATE_UPDATE_MTS_TRIGGERS = [
  `insert_#{tableName}_createdAt_and_updatedAt
    AFTER INSERT ON #{tableName}
    FOR EACH ROW
    BEGIN
      UPDATE #{tableName}
        SET createdAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT),
          updatedAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT)
        WHERE _id = NEW._id;
    END`,
  `update_#{tableName}_updatedAt
    AFTER UPDATE ON #{tableName}
    FOR EACH ROW
    BEGIN
      UPDATE #{tableName}
        SET updatedAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT)
        WHERE _id = NEW._id;
    END`
]

const _getCreateUpdateMtsTriggers = (tableName) => {
  return CREATE_UPDATE_MTS_TRIGGERS.map((item) => {
    const sql = item.replace(/#{tableName\}/g, tableName)

    return `CREATE TRIGGER IF NOT EXISTS ${sql}`
  })
}

class MigrationV31 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE users ADD COLUMN createdAt BIGINT',
      'ALTER TABLE users ADD COLUMN updatedAt BIGINT',
      ..._getCreateUpdateMtsTriggers('users'),
      `UPDATE users
        SET createdAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT),
          updatedAt = CAST((julianday('now') - 2440587.5) * 86400000.0 as INT)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      'DROP TRIGGER insert_users_createdAt_and_updatedAt',
      'DROP TRIGGER update_users_updatedAt',
      ...getSqlArrToModifyColumns(
        'users',
        {
          _id: ID_PRIMARY_KEY,
          id: 'BIGINT',
          email: 'VARCHAR(255)',
          apiKey: 'VARCHAR(255) NOT NULL',
          apiSecret: 'VARCHAR(255) NOT NULL',
          active: 'INT',
          isDataFromDb: 'INT',
          timezone: 'VARCHAR(255)',
          username: 'VARCHAR(255)',
          passwordHash: 'VARCHAR(255)',
          isNotProtected: 'INT',
          isSubAccount: 'INT',
          isSubUser: 'INT'
        }
      )
    ]

    this.addSql(sqlArr)
  }
}

module.exports = MigrationV31
