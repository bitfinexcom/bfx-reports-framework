'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV30 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      `UPDATE ledgers SET _category = 228
        WHERE description LIKE '%margin funding fee%' COLLATE NOCASE`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      `UPDATE ledgers SET _category = null
        WHERE description LIKE '%margin funding fee%' COLLATE NOCASE`
    ]

    this.addSql(sqlArr)
  }
}

module.exports = MigrationV30
