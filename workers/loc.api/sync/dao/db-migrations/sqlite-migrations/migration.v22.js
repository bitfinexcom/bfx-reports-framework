'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToModifyColumns } = require('./helpers')

class MigrationV22 extends AbstractMigration {
  /**
   * @override
   */
  before () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  up () {
    const sqlArr = [
      'DROP INDEX IF EXISTS completedOnFirstSyncColls_collName_user_id',

      'ALTER TABLE completedOnFirstSyncColls ADD COLUMN mts BIGINT',
      'ALTER TABLE completedOnFirstSyncColls ADD COLUMN subUserId INT',

      ...getSqlArrToModifyColumns(
        'completedOnFirstSyncColls',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          collName: 'VARCHAR(255) NOT NULL',
          mts: 'BIGINT',
          subUserId: 'INT',
          user_id: 'INT',
          __constraints__: [
            `CONSTRAINT completedOnFirstSyncColls_fk_user_id
              FOREIGN KEY (user_id)
              REFERENCES users(_id)
              ON UPDATE CASCADE
              ON DELETE CASCADE`,
            `CONSTRAINT completedOnFirstSyncColls_fk_subUserId
              FOREIGN KEY (subUserId)
              REFERENCES users(_id)
              ON UPDATE CASCADE
              ON DELETE CASCADE`
          ]
        }
      ),

      `CREATE UNIQUE INDEX completedOnFirstSyncColls_collName
        ON completedOnFirstSyncColls (collName)
        WHERE user_id IS NULL`,
      `CREATE UNIQUE INDEX completedOnFirstSyncColls_user_id_collName
        ON completedOnFirstSyncColls (user_id, collName)
        WHERE user_id IS NOT NULL AND subUserId IS NULL`,
      `CREATE UNIQUE INDEX completedOnFirstSyncColls_user_id_subUserId_collName
        ON completedOnFirstSyncColls (user_id, subUserId, collName)
        WHERE user_id IS NOT NULL AND subUserId IS NOT NULL`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      'DROP INDEX IF EXISTS completedOnFirstSyncColls_collName',
      'DROP INDEX IF EXISTS completedOnFirstSyncColls_user_id_collName',
      'DROP INDEX IF EXISTS completedOnFirstSyncColls_user_id_subUserId_collName',

      ...getSqlArrToModifyColumns(
        'completedOnFirstSyncColls',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          collName: 'VARCHAR(255)',
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT completedOnFirstSyncColls_fk_user_id
            FOREIGN KEY(user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
        }
      ),

      `CREATE UNIQUE INDEX completedOnFirstSyncColls_collName_user_id
        ON completedOnFirstSyncColls (collName, user_id)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  after () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV22
