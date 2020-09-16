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
      ),
      ...getSqlArrToModifyColumns(
        'trades',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'BIGINT',
          symbol: 'VARCHAR(255)',
          mtsCreate: 'BIGINT',
          orderID: 'BIGINT',
          execAmount: 'DECIMAL(22,12)',
          execPrice: 'DECIMAL(22,12)',
          orderType: 'VARCHAR(255)',
          orderPrice: 'DECIMAL(22,12)',
          maker: 'INT',
          fee: 'DECIMAL(22,12)',
          feeCurrency: 'VARCHAR(255)',
          subUserId: 'INT',
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
          FOREIGN KEY (user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToModifyColumns(
        'fundingTrades',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'BIGINT',
          symbol: 'VARCHAR(255)',
          mtsCreate: 'BIGINT',
          offerID: 'BIGINT',
          amount: 'DECIMAL(22,12)',
          rate: 'DECIMAL(22,12)',
          period: 'BIGINT',
          maker: 'INT',
          subUserId: 'INT',
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
          FOREIGN KEY (user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToModifyColumns(
        'orders',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'BIGINT',
          gid: 'BIGINT',
          cid: 'BIGINT',
          symbol: 'VARCHAR(255)',
          mtsCreate: 'BIGINT',
          mtsUpdate: 'BIGINT',
          amount: 'DECIMAL(22,12)',
          amountOrig: 'DECIMAL(22,12)',
          type: 'VARCHAR(255)',
          typePrev: 'VARCHAR(255)',
          flags: 'INT',
          status: 'VARCHAR(255)',
          price: 'DECIMAL(22,12)',
          priceAvg: 'DECIMAL(22,12)',
          priceTrailing: 'DECIMAL(22,12)',
          priceAuxLimit: 'DECIMAL(22,12)',
          notify: 'INT',
          placedId: 'BIGINT',
          _lastAmount: 'DECIMAL(22,12)',
          amountExecuted: 'DECIMAL(22,12)',
          subUserId: 'INT',
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
          FOREIGN KEY (user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToModifyColumns(
        'movements',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'BIGINT',
          currency: 'VARCHAR(255)',
          currencyName: 'VARCHAR(255)',
          mtsStarted: 'BIGINT',
          mtsUpdated: 'BIGINT',
          status: 'VARCHAR(255)',
          amount: 'DECIMAL(22,12)',
          amountUsd: 'DECIMAL(22,12)',
          fees: 'DECIMAL(22,12)',
          destinationAddress: 'VARCHAR(255)',
          transactionId: 'VARCHAR(255)',
          subUserId: 'INT',
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
          FOREIGN KEY (user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToModifyColumns(
        'fundingOfferHistory',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'BIGINT',
          symbol: 'VARCHAR(255)',
          mtsCreate: 'BIGINT',
          mtsUpdate: 'BIGINT',
          amount: 'DECIMAL(22,12)',
          amountOrig: 'DECIMAL(22,12)',
          type: 'VARCHAR(255)',
          flags: 'TEXT',
          status: 'TEXT',
          rate: 'VARCHAR(255)',
          period: 'INT',
          notify: 'INT',
          hidden: 'INT',
          renew: 'INT',
          rateReal: 'INT',
          amountExecuted: 'DECIMAL(22,12)',
          subUserId: 'INT',
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
          FOREIGN KEY (user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToModifyColumns(
        'fundingLoanHistory',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'BIGINT',
          symbol: 'VARCHAR(255)',
          side: 'INT',
          mtsCreate: 'BIGINT',
          mtsUpdate: 'BIGINT',
          amount: 'DECIMAL(22,12)',
          flags: 'TEXT',
          status: 'TEXT',
          rate: 'VARCHAR(255)',
          period: 'INT',
          mtsOpening: 'BIGINT',
          mtsLastPayout: 'BIGINT',
          notify: 'INT',
          hidden: 'INT',
          renew: 'INT',
          rateReal: 'INT',
          noClose: 'INT',
          subUserId: 'INT',
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
          FOREIGN KEY (user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToModifyColumns(
        'fundingCreditHistory',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'BIGINT',
          symbol: 'VARCHAR(255)',
          side: 'INT',
          mtsCreate: 'BIGINT',
          mtsUpdate: 'BIGINT',
          amount: 'DECIMAL(22,12)',
          flags: 'TEXT',
          status: 'TEXT',
          rate: 'VARCHAR(255)',
          period: 'INT',
          mtsOpening: 'BIGINT',
          mtsLastPayout: 'BIGINT',
          notify: 'INT',
          hidden: 'INT',
          renew: 'INT',
          rateReal: 'INT',
          noClose: 'INT',
          positionPair: 'VARCHAR(255)',
          subUserId: 'INT',
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
          FOREIGN KEY (user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToModifyColumns(
        'positionsHistory',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'BIGINT',
          symbol: 'VARCHAR(255)',
          status: 'VARCHAR(255)',
          amount: 'DECIMAL(22,12)',
          basePrice: 'DECIMAL(22,12)',
          closePrice: 'DECIMAL(22,12)',
          marginFunding: 'DECIMAL(22,12)',
          marginFundingType: 'INT',
          pl: 'DECIMAL(22,12)',
          plPerc: 'DECIMAL(22,12)',
          liquidationPrice: 'DECIMAL(22,12)',
          leverage: 'DECIMAL(22,12)',
          placeholder: 'TEXT',
          mtsCreate: 'BIGINT',
          mtsUpdate: 'BIGINT',
          subUserId: 'INT',
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
          FOREIGN KEY (user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToModifyColumns(
        'logins',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'BIGINT',
          time: 'BIGINT',
          ip: 'VARCHAR(255)',
          extraData: 'TEXT',
          subUserId: 'INT',
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
          FOREIGN KEY (user_id)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToModifyColumns(
        'changeLogs',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          mtsCreate: 'BIGINT',
          log: 'VARCHAR(255)',
          ip: 'VARCHAR(255)',
          userAgent: 'TEXT',
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
