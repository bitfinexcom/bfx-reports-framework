'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV28 extends AbstractMigration {
  _getRemappingSubUserIdSQL (tableNames = []) {
    return tableNames.map((tableName) => (
      `UPDATE ${tableName} AS up SET subUserId = (
        SELECT subUserId FROM subAccounts AS sa WHERE masterUserId = up.user_id AND (
          SELECT 1 FROM users AS WHERE _id = up.subUserId AND email = (
            SELECT email FROM users WHERE _id = sa.subUserId
          )
        )
      )
        WHERE subUserId IS NOT NULL`
    ))
  }

  /**
   * @override
   */
  before () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  up () {
    const sqlArr = [
      `UPDATE users SET isNotProtected = 1
        WHERE isSubUser = 1 AND isNotProtected != 1 AND username LIKE '%-sub-user-' || (
          SELECT id FROM users WHERE isSubAccount = 1 AND isNotProtected = 1
        )`,
      `UPDATE subAccounts AS sa SET subUserId = (
        SELECT _id FROM users WHERE isSubUser = 1 AND email = (
          SELECT email FROM users WHERE _id = sa.subUserId
        ) AND username LIKE '%-sub-user-' || (
          SELECT id FROM users WHERE isSubAccount = 1 AND _id = sa.masterUserId
        )
      )`,

      ...this._getRemappingSubUserIdSQL([
        'ledregs'
      ])
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  after () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV28
