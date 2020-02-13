'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV2 extends AbstractMigration {
  /**
   * @override
   */
  before () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  async up () {
    const sqlArr = [
      `CREATE TABLE logins (
        _id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        id BIGINT,
        time BIGINT,
        ip VARCHAR(255),
        extraData TEXT,
        user_id INT NOT NULL,
        CONSTRAINT logins_fk_user_id
          FOREIGN KEY(user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      )`,

      `CREATE UNIQUE INDEX logins_id_time_user_id
        ON logins (id, time, user_id)`,
      `CREATE INDEX logins_time
        ON logins (time)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  async down () {
    const sqlArr = [
      'DROP TABLE logins'
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  after () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV2
