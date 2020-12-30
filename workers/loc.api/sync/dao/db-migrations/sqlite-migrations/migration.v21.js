'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV21 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      `UPDATE ledgers SET _category = 29
        WHERE description LIKE 'funding event%' COLLATE NOCASE`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      `UPDATE ledgers SET _category = null
        WHERE description LIKE 'funding event%' COLLATE NOCASE`
    ]

    this.addSql(sqlArr)
  }
}

module.exports = MigrationV21
