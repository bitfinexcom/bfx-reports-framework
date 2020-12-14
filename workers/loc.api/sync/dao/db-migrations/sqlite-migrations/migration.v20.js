'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV20 extends AbstractMigration {
  /**
   * @override
   */
  before () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  async up () {
    const sqlArr = [
      `CREATE TABLE mapSymbols (
        _id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        key VARCHAR(255),
        value VARCHAR(255)
      )`,
      `CREATE TABLE inactiveCurrencies (
        _id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        pairs VARCHAR(255)
      )`,

      `CREATE UNIQUE INDEX mapSymbols_key_value
        ON mapSymbols(key, value)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  async down () {
    const sqlArr = [
      'DROP TABLE mapSymbols',
      'DROP TABLE inactiveCurrencies'
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  after () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV20
