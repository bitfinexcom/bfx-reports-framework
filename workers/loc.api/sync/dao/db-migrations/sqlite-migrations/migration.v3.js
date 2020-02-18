'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToRemoveColumns } = require('./helpers')

class MigrationV3 extends AbstractMigration {
  /**
   * @override
   */
  beforeUp () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  up () {
    const sqlArr = [
      `CREATE TABLE subAccounts (
        _id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        masterUserId INT NOT NULL,
        subUserId INT NOT NULL,
        CONSTRAINT subAccounts_fk_subUserId
          FOREIGN KEY(subUserId)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT subAccounts_fk_masterUserId
          FOREIGN KEY(masterUserId)
          REFERENCES users(_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      )`,

      'ALTER TABLE ledgers ADD COLUMN _nativeBalance DECIMAL(22,12)',
      'ALTER TABLE ledgers ADD COLUMN _nativeBalanceUsd DECIMAL(22,12)',
      'ALTER TABLE ledgers ADD COLUMN _isBalanceRecalced INT',
      'ALTER TABLE ledgers ADD COLUMN subUserId INT',
      'ALTER TABLE trades ADD COLUMN subUserId INT',
      'ALTER TABLE fundingTrades ADD COLUMN subUserId INT',
      'ALTER TABLE orders ADD COLUMN subUserId INT',
      'ALTER TABLE movements ADD COLUMN subUserId INT',
      'ALTER TABLE fundingOfferHistory ADD COLUMN subUserId INT',
      'ALTER TABLE fundingLoanHistory ADD COLUMN subUserId INT',
      'ALTER TABLE fundingCreditHistory ADD COLUMN subUserId INT',
      'ALTER TABLE positionsHistory ADD COLUMN subUserId INT',
      'ALTER TABLE logins ADD COLUMN subUserId INT',

      `CREATE UNIQUE INDEX ledgers_id_mts_user_id
        ON ledgers (id, mts, user_id)`,
      'DROP INDEX ledgers_id_mts',
      `CREATE UNIQUE INDEX trades_id_mtsCreate_orderID_fee_user_id
        ON trades(id, mtsCreate, orderID, fee, user_id)`,
      'DROP INDEX trades_id_mtsCreate_orderID_fee',
      `CREATE UNIQUE INDEX fundingTrades_id_mtsCreate_offerID_user_id
        ON fundingTrades(id, mtsCreate, offerID, user_id)`,
      'DROP INDEX fundingTrades_id_mtsCreate_offerID',
      `CREATE UNIQUE INDEX orders_id_mtsUpdate_user_id
        ON orders(id, mtsUpdate, user_id)`,
      'DROP INDEX orders_id_mtsUpdate',
      `CREATE UNIQUE INDEX movements_id_mtsUpdated_user_id
        ON movements(id, mtsUpdated, user_id)`,
      'DROP INDEX movements_id_mtsUpdated',
      `CREATE UNIQUE INDEX fundingOfferHistory_id_mtsUpdate_user_id
        ON fundingOfferHistory(id, mtsUpdate, user_id)`,
      'DROP INDEX fundingOfferHistory_id_mtsUpdate',
      `CREATE UNIQUE INDEX fundingLoanHistory_id_mtsUpdate_user_id
        ON fundingLoanHistory(id, mtsUpdate, user_id)`,
      'DROP INDEX fundingLoanHistory_id_mtsUpdate',
      `CREATE UNIQUE INDEX fundingCreditHistory_id_mtsUpdate_user_id
        ON fundingCreditHistory(id, mtsUpdate, user_id)`,
      'DROP INDEX fundingCreditHistory_id_mtsUpdate',
      `CREATE UNIQUE INDEX positionsHistory_id_mtsUpdate_user_id
        ON positionsHistory(id, mtsUpdate, user_id)`,
      'DROP INDEX positionsHistory_id_mtsUpdate'
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  afterUp () { return this.dao.enableForeignKeys() }

  /**
   * @override
   */
  async beforeDown () {
    const sql = `DELETE FROM users WHERE _id IN (
        SELECT DISTINCT u._id FROM users AS u
          INNER JOIN subAccounts AS sa ON u._id = sa.masterUserId
      )`

    await this.dao.executeQueriesInTrans(
      sql,
      { beforeTransFn: () => this.dao.enableForeignKeys() }
    )
    await this.dao.disableForeignKeys()
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      'DROP TABLE subAccounts',

      'DROP INDEX ledgers_id_mts_user_id',
      'DROP INDEX trades_id_mtsCreate_orderID_fee_user_id',
      'DROP INDEX fundingTrades_id_mtsCreate_offerID_user_id',
      'DROP INDEX orders_id_mtsUpdate_user_id',
      'DROP INDEX movements_id_mtsUpdated_user_id',
      'DROP INDEX fundingOfferHistory_id_mtsUpdate_user_id',
      'DROP INDEX fundingLoanHistory_id_mtsUpdate_user_id',
      'DROP INDEX fundingCreditHistory_id_mtsUpdate_user_id',
      'DROP INDEX positionsHistory_id_mtsUpdate_user_id',

      ...getSqlArrToRemoveColumns(
        'ledgers',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'BIGINT',
          currency: 'VARCHAR(255)',
          mts: 'BIGINT',
          amount: 'DECIMAL(22,12)',
          amountUsd: 'DECIMAL(22,12)',
          balance: 'DECIMAL(22,12)',
          balanceUsd: 'DECIMAL(22,12)',
          description: 'TEXT',
          wallet: 'VARCHAR(255)',
          _isMarginFundingPayment: 'INT',
          _isAffiliateRebate: 'INT',
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToRemoveColumns(
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
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToRemoveColumns(
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
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToRemoveColumns(
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
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToRemoveColumns(
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
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToRemoveColumns(
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
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToRemoveColumns(
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
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToRemoveColumns(
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
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToRemoveColumns(
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
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToRemoveColumns(
        'logins',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          id: 'BIGINT',
          time: 'BIGINT',
          ip: 'VARCHAR(255)',
          extraData: 'TEXT',
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
        }
      ),

      `CREATE UNIQUE INDEX ledgers_id_mts
        ON ledgers (id, mts)`,
      `CREATE UNIQUE INDEX trades_id_mtsCreate_orderID_fee
        ON trades(id, mtsCreate, orderID, fee)`,
      `CREATE UNIQUE INDEX fundingTrades_id_mtsCreate_offerID
        ON fundingTrades(id, mtsCreate, offerID)`,
      `CREATE UNIQUE INDEX orders_id_mtsUpdate
        ON orders(id, mtsUpdate)`,
      `CREATE UNIQUE INDEX movements_id_mtsUpdated
        ON movements(id, mtsUpdated)`,
      `CREATE UNIQUE INDEX fundingOfferHistory_id_mtsUpdate
        ON fundingOfferHistory(id, mtsUpdate)`,
      `CREATE UNIQUE INDEX fundingLoanHistory_id_mtsUpdate
        ON fundingLoanHistory(id, mtsUpdate)`,
      `CREATE UNIQUE INDEX fundingCreditHistory_id_mtsUpdate
        ON fundingCreditHistory(id, mtsUpdate)`,
      `CREATE UNIQUE INDEX positionsHistory_id_mtsUpdate
        ON positionsHistory(id, mtsUpdate)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  afterDown () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV3
