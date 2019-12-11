'use strict'

const AbstractMigration = require('./abstract.migration')
const {
  getFnArrToRemoveAllTables
} = require('../helpers')

class MigrationV1 extends AbstractMigration {
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
  down () {}
}

module.exports = MigrationV1
