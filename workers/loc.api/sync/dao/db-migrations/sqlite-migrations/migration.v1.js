'use strict'

const AbstractMigration = require('./abstract.migration')
const {
  getFnArrToRemoveAllTables
} = require('../helpers')

class MigrationV1 extends AbstractMigration {
  /**
   * @override
   */
  beforeUp () { this.dao.disableForeignKeys() }

  /**
   * @override
   */
  async up () {
    const fnArrToRemoveAllTables = await getFnArrToRemoveAllTables(
      this.dao,
      true
    )

    this.addSql(fnArrToRemoveAllTables)
  }

  /**
   * @override
   */
  afterUp () { this.dao.enableForeignKeys() }

  /**
   * @override
   */
  down () {}
}

module.exports = MigrationV1
