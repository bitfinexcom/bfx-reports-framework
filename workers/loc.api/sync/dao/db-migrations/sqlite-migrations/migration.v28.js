'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV28 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      `UPDATE users SET isNotProtected = 1
      WHERE isSubUser = 1 AND isNotProtected != 1 AND username LIKE '%-sub-user-' || (
        SELECT id FROM users WHERE isSubAccount = 1 AND isNotProtected = 1
      )`
    ]

    this.addSql(sqlArr)
  }
}

module.exports = MigrationV28
