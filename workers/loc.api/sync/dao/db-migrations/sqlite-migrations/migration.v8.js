'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV8 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      `CREATE TABLE inactiveSymbols (
        _id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        pairs VARCHAR(255)
      )`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      'DROP TABLE inactiveSymbols'
    ]

    this.addSql(sqlArr)
  }
}

module.exports = MigrationV8
