'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV17 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      `UPDATE ledgers SET _category = 22
        WHERE description LIKE 'Position PL @% settlement (trade) on wallet margin'`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      `UPDATE ledgers SET _category = null
        WHERE description LIKE 'Position PL @% settlement (trade) on wallet margin'`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  afterDown () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV17
