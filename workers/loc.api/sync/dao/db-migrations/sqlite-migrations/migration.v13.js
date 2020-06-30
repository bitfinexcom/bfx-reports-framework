'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV13 extends AbstractMigration {
  /**
   * @override
   */
  before () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  async up () {
    const sqlArr = [
      `CREATE TABLE completedOnFirstSyncColls (
        _id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        collName VARCHAR(255),
        user_id INT NOT NULL,
        CONSTRAINT completedOnFirstSyncColls_fk_user_id
          FOREIGN KEY(user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      )`,

      `CREATE UNIQUE INDEX completedOnFirstSyncColls_collName_user_id
        ON completedOnFirstSyncColls (collName, user_id)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  async down () {
    const sqlArr = [
      'DROP TABLE completedOnFirstSyncColls'
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  after () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV13
