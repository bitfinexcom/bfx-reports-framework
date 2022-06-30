'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV27 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    /*
     * Force balance recalculation for sub-accounts
     * to apply the fix for sub-accounts recalculation hook after sync
    */
    const sqlArr = [
      `UPDATE ledgers SET _isBalanceRecalced = NULL
        WHERE subUserId IS NOT NULL`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    /*
     * Force balance recalculation for sub-accounts
     * to apply the fix for sub-accounts recalculation hook after sync
    */
    const sqlArr = [
      `UPDATE ledgers SET _isBalanceRecalced = NULL
        WHERE subUserId IS NOT NULL`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  async afterUp () {
    await this.processMessageManager.processState(
      this.processMessageManager.PROCESS_STATES.PREPARE_DB
    )
  }
}

module.exports = MigrationV27
