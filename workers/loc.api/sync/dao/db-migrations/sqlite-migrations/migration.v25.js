'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToModifyColumns } = require('./helpers')

class MigrationV25 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE ledgers ADD COLUMN _isSubAccountsTransfer INT',

      `CREATE INDEX ledgers_user_id__isSubAccountsTransfer_mts
        ON ledgers(user_id, _isSubAccountsTransfer, mts)`,

      `UPDATE ledgers SET _isSubAccountsTransfer = 1
        WHERE description COLLATE NOCASE LIKE 'transfer%sa(%)%'`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  beforeDown () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      'DROP INDEX IF EXISTS ledgers_user_id__isSubAccountsTransfer_mts',

      ...getSqlArrToModifyColumns(
        'ledgers',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'BIGINT',
          currency: 'VARCHAR(255)',
          mts: 'BIGINT',
          amount: 'DECIMAL(22,12)',
          amountUsd: 'DECIMAL(22,12)',
          balance: 'DECIMAL(22,12)',
          _nativeBalance: 'DECIMAL(22,12)',
          balanceUsd: 'DECIMAL(22,12)',
          _nativeBalanceUsd: 'DECIMAL(22,12)',
          description: 'TEXT',
          wallet: 'VARCHAR(255)',
          _category: 'INT',
          _isMarginFundingPayment: 'INT',
          _isAffiliateRebate: 'INT',
          _isStakingPayments: 'INT',
          _isBalanceRecalced: 'INT',
          subUserId: 'INT',
          user_id: 'INT NOT NULL',
          __constraints__: [
            `CONSTRAINT #{tableName}_fk_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`,
            `CONSTRAINT #{tableName}_fk_subUserId
            FOREIGN KEY (subUserId)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
          ]
        }
      )
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  afterDown () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV25
