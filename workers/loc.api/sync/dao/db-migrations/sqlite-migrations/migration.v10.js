'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV10 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'DROP INDEX ledgers_id_mts_user_id',
      'DROP INDEX trades_id_mtsCreate_orderID_fee_user_id',
      'DROP INDEX fundingTrades_id_mtsCreate_offerID_user_id',
      'DROP INDEX publicTrades_id_mts__symbol',
      'DROP INDEX statusMessages_timestamp_key__type',
      'DROP INDEX orders_id_mtsUpdate_user_id',
      'DROP INDEX fundingOfferHistory_id_mtsUpdate_user_id',
      'DROP INDEX fundingLoanHistory_id_mtsUpdate_user_id',
      'DROP INDEX fundingCreditHistory_id_mtsUpdate_user_id',
      'DROP INDEX positionsHistory_id_mtsUpdate_user_id',
      'DROP INDEX logins_id_time_user_id',

      'DELETE FROM ledgers',
      'DELETE FROM trades',
      'DELETE FROM fundingTrades',
      'DELETE FROM publicTrades',
      'DELETE FROM statusMessages',
      'DELETE FROM orders',
      'DELETE FROM fundingOfferHistory',
      'DELETE FROM fundingLoanHistory',
      'DELETE FROM fundingCreditHistory',
      'DELETE FROM positionsHistory',
      'DELETE FROM logins',

      `CREATE UNIQUE INDEX ledgers_id_user_id
        ON ledgers(id, user_id)`,
      `CREATE UNIQUE INDEX trades_id_symbol_user_id
        ON trades(id, symbol, user_id)`,
      `CREATE UNIQUE INDEX fundingTrades_id_user_id
        ON fundingTrades(id, user_id)`,
      `CREATE UNIQUE INDEX publicTrades_id__symbol
        ON publicTrades(id, _symbol)`,
      `CREATE UNIQUE INDEX statusMessages_key__type
        ON statusMessages(key, _type)`,
      `CREATE UNIQUE INDEX orders_id_user_id
        ON orders(id, user_id)`,
      `CREATE UNIQUE INDEX fundingOfferHistory_id_user_id
        ON fundingOfferHistory(id, user_id)`,
      `CREATE UNIQUE INDEX fundingLoanHistory_id_user_id
        ON fundingLoanHistory(id, user_id)`,
      `CREATE UNIQUE INDEX fundingCreditHistory_id_user_id
        ON fundingCreditHistory(id, user_id)`,
      `CREATE UNIQUE INDEX positionsHistory_id_user_id
        ON positionsHistory(id, user_id)`,
      `CREATE UNIQUE INDEX logins_id_user_id
        ON logins(id, user_id)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      'DROP INDEX ledgers_id_user_id',
      'DROP INDEX trades_id_symbol_user_id',
      'DROP INDEX fundingTrades_id_user_id',
      'DROP INDEX publicTrades_id__symbol',
      'DROP INDEX statusMessages_key__type',
      'DROP INDEX orders_id_user_id',
      'DROP INDEX fundingOfferHistory_id_user_id',
      'DROP INDEX fundingLoanHistory_id_user_id',
      'DROP INDEX fundingCreditHistory_id_user_id',
      'DROP INDEX positionsHistory_id_user_id',
      'DROP INDEX logins_id_user_id',

      'DELETE FROM ledgers',
      'DELETE FROM trades',
      'DELETE FROM fundingTrades',
      'DELETE FROM publicTrades',
      'DELETE FROM statusMessages',
      'DELETE FROM orders',
      'DELETE FROM fundingOfferHistory',
      'DELETE FROM fundingLoanHistory',
      'DELETE FROM fundingCreditHistory',
      'DELETE FROM positionsHistory',
      'DELETE FROM logins',

      `CREATE UNIQUE INDEX ledgers_id_mts_user_id
        ON ledgers(id, mts, user_id)`,
      `CREATE UNIQUE INDEX trades_id_mtsCreate_orderID_fee_user_id
        ON trades(id, mtsCreate, orderID, fee, user_id)`,
      `CREATE UNIQUE INDEX fundingTrades_id_mtsCreate_offerID_user_id
        ON fundingTrades(id, mtsCreate, offerID, user_id)`,
      `CREATE UNIQUE INDEX publicTrades_id_mts__symbol
        ON publicTrades(id, mts, _symbol)`,
      `CREATE UNIQUE INDEX statusMessages_timestamp_key__type
        ON statusMessages(timestamp, key, _type)`,
      `CREATE UNIQUE INDEX orders_id_mtsUpdate_user_id
        ON orders(id, mtsUpdate, user_id)`,
      `CREATE UNIQUE INDEX fundingOfferHistory_id_mtsUpdate_user_id
        ON fundingOfferHistory(id, mtsUpdate, user_id)`,
      `CREATE UNIQUE INDEX fundingLoanHistory_id_mtsUpdate_user_id
        ON fundingLoanHistory(id, mtsUpdate, user_id)`,
      `CREATE UNIQUE INDEX fundingCreditHistory_id_mtsUpdate_user_id
        ON fundingCreditHistory(id, mtsUpdate, user_id)`,
      `CREATE UNIQUE INDEX positionsHistory_id_mtsUpdate_user_id
        ON positionsHistory(id, mtsUpdate, user_id)`,
      `CREATE UNIQUE INDEX logins_id_time_user_id
        ON logins(id, time, user_id)`
    ]

    this.addSql(sqlArr)
  }
}

module.exports = MigrationV10
