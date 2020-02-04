'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV3 extends AbstractMigration {
  /**
   * @override
   */
  beforeUp () { this.dao.disableForeignKeys() }

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
  afterUp () { this.dao.enableForeignKeys() }

  /**
   * @override
   */
  down () {}
}

module.exports = MigrationV3
