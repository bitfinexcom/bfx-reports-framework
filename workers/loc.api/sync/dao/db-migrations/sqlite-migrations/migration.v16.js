'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToModifyColumns } = require('./helpers')

class MigrationV16 extends AbstractMigration {
  /**
   * @override
   */
  before () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  up () {
    const sqlArr = [
      `ALTER TABLE ledgers ADD CONSTRAINT ledgers_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
      `ALTER TABLE trades ADD CONSTRAINT trades_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
      `ALTER TABLE fundingTrades ADD CONSTRAINT fundingTrades_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
      `ALTER TABLE orders ADD CONSTRAINT orders_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
      `ALTER TABLE movements ADD CONSTRAINT movements_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
      `ALTER TABLE fundingOfferHistory ADD CONSTRAINT fundingOfferHistory_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
      `ALTER TABLE fundingLoanHistory ADD CONSTRAINT fundingLoanHistory_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
      `ALTER TABLE fundingCreditHistory ADD CONSTRAINT fundingCreditHistory_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
      `ALTER TABLE positionsHistory ADD CONSTRAINT positionsHistory_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
      `ALTER TABLE logins ADD CONSTRAINT logins_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
      `ALTER TABLE changeLogs ADD CONSTRAINT changeLogs_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    ]

    this.addSql(sqlArr)
  }

  /**
   * TODO:
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
          _category: 'INT',
          _isMarginFundingPayment: 'INT',
          _isAffiliateRebate: 'INT',
          _isStakingPayments: 'INT',
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
  after () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV16
