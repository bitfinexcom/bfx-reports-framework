'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV6 extends AbstractMigration {
  /**
   * @override
   */
  before () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  async up () {
    const sqlArr = [
      `CREATE TABLE changeLogs (
        _id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        mtsCreate BIGINT,
        log VARCHAR(255),
        ip VARCHAR(255),
        userAgent TEXT,
        subUserId INT,
        user_id INT NOT NULL,
        CONSTRAINT changeLogs_fk_user_id
          FOREIGN KEY(user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      )`,

      `CREATE UNIQUE INDEX changeLogs_mtsCreate_log_user_id
        ON changeLogs (mtsCreate, log, user_id)`,
      `CREATE INDEX changeLogs_mtsCreate
        ON changeLogs (mtsCreate)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  async down () {
    const sqlArr = [
      'DROP TABLE changeLogs'
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  after () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV6
