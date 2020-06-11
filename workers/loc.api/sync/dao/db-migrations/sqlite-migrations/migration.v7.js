'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToModifyColumns } = require('./helpers')

class MigrationV7 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE ledgers ADD COLUMN _isStakingPayments INT',

      `UPDATE ledgers SET _isStakingPayments = (
        SELECT 1 FROM (
          SELECT * FROM ledgers AS l
          WHERE l.description COLLATE NOCASE LIKE '%Staking Payments%'
            AND l._id = ledgers._id
        )
      )`
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
          _isMarginFundingPayment: 'INT',
          _isAffiliateRebate: 'INT',
          _isBalanceRecalced: 'INT',
          subUserId: 'INT',
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
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

module.exports = MigrationV7
