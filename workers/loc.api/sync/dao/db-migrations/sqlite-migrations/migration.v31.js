'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV31 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = []

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = []

    this.addSql(sqlArr)
  }
}

module.exports = MigrationV31
