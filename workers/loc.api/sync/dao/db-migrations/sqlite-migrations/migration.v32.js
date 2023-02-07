'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV32 extends AbstractMigration {
  /**
   * @override
   */
  before () { return this.dao.disableForeignKeys() }

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

  /**
   * @override
   */
  after () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV32
