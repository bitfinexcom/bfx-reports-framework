'use strict'

const AbstractMigration = require('./abstract.migration')

class MigrationV19 extends AbstractMigration {
  /**
   * @override
   */
  up () {
    const sqlArr = [
      'DROP INDEX ledgers_mts_currency',
      'DROP INDEX trades_mtsCreate_symbol',
      'DROP INDEX fundingTrades_mtsCreate_symbol',
      'DROP INDEX publicTrades_mts__symbol',
      'DROP INDEX orders_mtsUpdate_symbol',
      'DROP INDEX movements_mtsUpdated_currency',
      'DROP INDEX fundingOfferHistory_mtsUpdate_symbol',
      'DROP INDEX fundingLoanHistory_mtsUpdate_symbol',
      'DROP INDEX fundingCreditHistory_mtsUpdate_symbol',
      'DROP INDEX positionsHistory_mtsUpdate_symbol',
      'DROP INDEX positionsSnapshot_mtsUpdate_symbol',
      'DROP INDEX logins_time',
      'DROP INDEX changeLogs_mtsCreate',
      'DROP INDEX tickersHistory_mtsUpdate_symbol',
      'DROP INDEX statusMessages_timestamp_key',
      'DROP INDEX candles_mts__symbol',

      `CREATE INDEX ledgers_user_id_wallet_currency_mts
        ON ledgers(user_id, wallet, currency, mts)`,
      `CREATE INDEX ledgers_user_id_wallet_mts
        ON ledgers(user_id, wallet, mts)`,
      `CREATE INDEX ledgers_user_id_currency_mts
        ON ledgers(user_id, currency, mts)`,
      `CREATE INDEX ledgers_user_id__isMarginFundingPayment_mts
        ON ledgers(user_id, _isMarginFundingPayment, mts)`,
      `CREATE INDEX ledgers_user_id__isAffiliateRebate_mts
        ON ledgers(user_id, _isAffiliateRebate, mts)`,
      `CREATE INDEX ledgers_user_id__isStakingPayments_mts
        ON ledgers(user_id, _isStakingPayments, mts)`,
      `CREATE INDEX ledgers_user_id__category_mts
        ON ledgers(user_id, _category, mts)`,
      `CREATE INDEX ledgers_user_id_mts
        ON ledgers(user_id, mts)`,
      `CREATE INDEX ledgers_currency_mts
        ON ledgers(currency, mts)`,
      `CREATE INDEX ledgers_user_id_subUserId_mts
        ON ledgers(user_id, subUserId, mts)
        WHERE subUserId IS NOT NULL`,
      `CREATE INDEX ledgers_subUserId_mts__id
        ON ledgers(subUserId, mts, _id)
        WHERE subUserId IS NOT NULL`,

      `CREATE INDEX trades_user_id_symbol_mtsCreate
        ON trades(user_id, symbol, mtsCreate)`,
      `CREATE INDEX trades_user_id_orderID_mtsCreate
        ON trades(user_id, orderID, mtsCreate)`,
      `CREATE INDEX trades_user_id_mtsCreate
        ON trades(user_id, mtsCreate)`,
      `CREATE INDEX trades_user_id_subUserId_mtsCreate
        ON trades(user_id, subUserId, mtsCreate)
        WHERE subUserId IS NOT NULL`,
      `CREATE INDEX trades_subUserId_orderID
        ON trades(subUserId, orderID)
        WHERE subUserId IS NOT NULL`,

      `CREATE INDEX fundingTrades_user_id_symbol_mtsCreate
        ON fundingTrades(user_id, symbol, mtsCreate)`,
      `CREATE INDEX fundingTrades_user_id_mtsCreate
        ON fundingTrades(user_id, mtsCreate)`,
      `CREATE INDEX fundingTrades_user_id_subUserId_mtsCreate
        ON fundingTrades(user_id, subUserId, mtsCreate)
        WHERE subUserId IS NOT NULL`,

      `CREATE INDEX publicTrades__symbol_mts
        ON publicTrades(_symbol, mts)`,
      `CREATE INDEX publicTrades_mts
        ON publicTrades(mts)`,

      `CREATE INDEX orders_user_id_symbol_mtsUpdate
        ON orders(user_id, symbol, mtsUpdate)`,
      `CREATE INDEX orders_user_id_type_mtsUpdate
        ON orders(user_id, type, mtsUpdate)`,
      `CREATE INDEX orders_user_id_mtsUpdate
        ON orders(user_id, mtsUpdate)`,
      `CREATE INDEX orders_user_id_subUserId_mtsUpdate
        ON orders(user_id, subUserId, mtsUpdate)
        WHERE subUserId IS NOT NULL`,

      `CREATE INDEX movements_user_id_status_mtsStarted
        ON movements(user_id, status, mtsStarted)`,
      `CREATE INDEX movements_user_id_status_mtsUpdated
        ON movements(user_id, status, mtsUpdated)`,
      `CREATE INDEX movements_user_id_currency_mtsUpdated
        ON movements(user_id, currency, mtsUpdated)`,
      `CREATE INDEX movements_user_id_mtsUpdated
        ON movements(user_id, mtsUpdated)`,
      `CREATE INDEX movements_user_id_subUserId_mtsUpdated
        ON movements(user_id, subUserId, mtsUpdated)
        WHERE subUserId IS NOT NULL`,

      `CREATE INDEX fundingOfferHistory_user_id_symbol_mtsUpdate
        ON fundingOfferHistory(user_id, symbol, mtsUpdate)`,
      `CREATE INDEX fundingOfferHistory_user_id_status_mtsUpdate
        ON fundingOfferHistory(user_id, status, mtsUpdate)`,
      `CREATE INDEX fundingOfferHistory_user_id_mtsUpdate
        ON fundingOfferHistory(user_id, mtsUpdate)`,
      `CREATE INDEX fundingOfferHistory_user_id_subUserId_mtsUpdate
        ON fundingOfferHistory(user_id, subUserId, mtsUpdate)
        WHERE subUserId IS NOT NULL`,

      `CREATE INDEX fundingLoanHistory_user_id_symbol_mtsUpdate
        ON fundingLoanHistory(user_id, symbol, mtsUpdate)`,
      `CREATE INDEX fundingLoanHistory_user_id_status_mtsUpdate
        ON fundingLoanHistory(user_id, status, mtsUpdate)`,
      `CREATE INDEX fundingLoanHistory_user_id_mtsUpdate
        ON fundingLoanHistory(user_id, mtsUpdate)`,
      `CREATE INDEX fundingLoanHistory_user_id_subUserId_mtsUpdate
        ON fundingLoanHistory(user_id, subUserId, mtsUpdate)
        WHERE subUserId IS NOT NULL`,

      `CREATE INDEX fundingCreditHistory_user_id_symbol_mtsUpdate
        ON fundingCreditHistory(user_id, symbol, mtsUpdate)`,
      `CREATE INDEX fundingCreditHistory_user_id_status_mtsUpdate
        ON fundingCreditHistory(user_id, status, mtsUpdate)`,
      `CREATE INDEX fundingCreditHistory_user_id_mtsUpdate
        ON fundingCreditHistory(user_id, mtsUpdate)`,
      `CREATE INDEX fundingCreditHistory_user_id_subUserId_mtsUpdate
        ON fundingCreditHistory(user_id, subUserId, mtsUpdate)
        WHERE subUserId IS NOT NULL`,

      `CREATE INDEX positionsHistory_user_id_symbol_mtsUpdate
        ON positionsHistory(user_id, symbol, mtsUpdate)`,
      `CREATE INDEX positionsHistory_user_id_mtsUpdate_mtsCreate
        ON positionsHistory(user_id, mtsUpdate, mtsCreate)`,
      `CREATE INDEX positionsHistory_user_id_mtsUpdate
        ON positionsHistory(user_id, mtsUpdate)`,
      `CREATE INDEX positionsHistory_user_id_subUserId_mtsUpdate
        ON positionsHistory(user_id, subUserId, mtsUpdate)
        WHERE subUserId IS NOT NULL`,
      `CREATE INDEX positionsHistory_subUserId_id
        ON positionsHistory(subUserId, id)
        WHERE subUserId IS NOT NULL`,

      `CREATE INDEX positionsSnapshot_user_id_mtsUpdate
        ON positionsSnapshot(user_id, mtsUpdate)`,
      `CREATE INDEX positionsSnapshot_user_id_symbol_mtsUpdate
        ON positionsSnapshot(user_id, symbol, mtsUpdate)`,
      `CREATE INDEX positionsSnapshot_user_id_subUserId_mtsUpdate
        ON positionsSnapshot(user_id, subUserId, mtsUpdate)
        WHERE subUserId IS NOT NULL`,

      `CREATE INDEX logins_user_id_time
        ON logins(user_id, time)`,
      `CREATE INDEX logins_user_id_subUserId_time
        ON logins(user_id, subUserId, time)
        WHERE subUserId IS NOT NULL`,

      `CREATE INDEX changeLogs_user_id_mtsCreate
        ON changeLogs(user_id, mtsCreate)`,
      `CREATE INDEX changeLogs_user_id_subUserId_mtsCreate
        ON changeLogs(user_id, subUserId, mtsCreate)
        WHERE subUserId IS NOT NULL`,

      `CREATE INDEX tickersHistory_symbol_mtsUpdate
        ON tickersHistory(symbol, mtsUpdate)`,

      `CREATE INDEX statusMessages_key_timestamp
        ON statusMessages(key, timestamp)`,

      `CREATE INDEX candles__timeframe_mts
        ON candles(_timeframe, mts)`,
      `CREATE INDEX candles__symbol_mts
        ON candles(_symbol, mts)`,
      `CREATE INDEX candles_close_mts
        ON candles(close, mts)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      'DROP INDEX ledgers_user_id_wallet_currency_mts',
      'DROP INDEX ledgers_user_id_wallet_mts',
      'DROP INDEX ledgers_user_id_currency_mts',
      'DROP INDEX ledgers_user_id__isMarginFundingPayment_mts',
      'DROP INDEX ledgers_user_id__isAffiliateRebate_mts',
      'DROP INDEX ledgers_user_id__isStakingPayments_mts',
      'DROP INDEX ledgers_user_id__category_mts',
      'DROP INDEX ledgers_user_id_mts',
      'DROP INDEX ledgers_currency_mts',
      'DROP INDEX ledgers_user_id_subUserId_mts',
      'DROP INDEX ledgers_subUserId_mts__id',

      'DROP INDEX trades_user_id_symbol_mtsCreate',
      'DROP INDEX trades_user_id_orderID_mtsCreate',
      'DROP INDEX trades_user_id_mtsCreate',
      'DROP INDEX trades_user_id_subUserId_mtsCreate',
      'DROP INDEX trades_subUserId_orderID',

      'DROP INDEX fundingTrades_user_id_symbol_mtsCreate',
      'DROP INDEX fundingTrades_user_id_mtsCreate',
      'DROP INDEX fundingTrades_user_id_subUserId_mtsCreate',

      'DROP INDEX publicTrades__symbol_mts',
      'DROP INDEX publicTrades_mts',

      'DROP INDEX orders_user_id_symbol_mtsUpdate',
      'DROP INDEX orders_user_id_type_mtsUpdate',
      'DROP INDEX orders_user_id_mtsUpdate',
      'DROP INDEX orders_user_id_subUserId_mtsUpdate',

      'DROP INDEX movements_user_id_status_mtsStarted',
      'DROP INDEX movements_user_id_status_mtsUpdated',
      'DROP INDEX movements_user_id_currency_mtsUpdated',
      'DROP INDEX movements_user_id_mtsUpdated',
      'DROP INDEX movements_user_id_subUserId_mtsUpdated',

      'DROP INDEX fundingOfferHistory_user_id_symbol_mtsUpdate',
      'DROP INDEX fundingOfferHistory_user_id_status_mtsUpdate',
      'DROP INDEX fundingOfferHistory_user_id_mtsUpdate',
      'DROP INDEX fundingOfferHistory_user_id_subUserId_mtsUpdate',

      'DROP INDEX fundingLoanHistory_user_id_symbol_mtsUpdate',
      'DROP INDEX fundingLoanHistory_user_id_status_mtsUpdate',
      'DROP INDEX fundingLoanHistory_user_id_mtsUpdate',
      'DROP INDEX fundingLoanHistory_user_id_subUserId_mtsUpdate',

      'DROP INDEX fundingCreditHistory_user_id_symbol_mtsUpdate',
      'DROP INDEX fundingCreditHistory_user_id_status_mtsUpdate',
      'DROP INDEX fundingCreditHistory_user_id_mtsUpdate',
      'DROP INDEX fundingCreditHistory_user_id_subUserId_mtsUpdate',

      'DROP INDEX positionsHistory_user_id_symbol_mtsUpdate',
      'DROP INDEX positionsHistory_user_id_mtsUpdate_mtsCreate',
      'DROP INDEX positionsHistory_user_id_mtsUpdate',
      'DROP INDEX positionsHistory_user_id_subUserId_mtsUpdate',
      'DROP INDEX positionsHistory_subUserId_id',

      'DROP INDEX positionsSnapshot_user_id_mtsUpdate',
      'DROP INDEX positionsSnapshot_user_id_symbol_mtsUpdate',
      'DROP INDEX positionsSnapshot_user_id_subUserId_mtsUpdate',

      'DROP INDEX logins_user_id_time',
      'DROP INDEX logins_user_id_subUserId_time',

      'DROP INDEX changeLogs_user_id_mtsCreate',
      'DROP INDEX changeLogs_user_id_subUserId_mtsCreate',

      'DROP INDEX tickersHistory_symbol_mtsUpdate',

      'DROP INDEX statusMessages_key_timestamp',

      'DROP INDEX candles__timeframe_mts',
      'DROP INDEX candles__symbol_mts',
      'DROP INDEX candles_close_mts',

      `CREATE INDEX ledgers_mts_currency
        ON ledgers(mts, currency)`,
      `CREATE INDEX trades_mtsCreate_symbol
        ON trades(mtsCreate, symbol)`,
      `CREATE INDEX fundingTrades_mtsCreate_symbol
        ON fundingTrades(mtsCreate, symbol)`,
      `CREATE INDEX publicTrades_mts__symbol
        ON publicTrades(mts, _symbol)`,
      `CREATE INDEX orders_mtsUpdate_symbol
        ON orders(mtsUpdate, symbol)`,
      `CREATE INDEX movements_mtsUpdated_currency
        ON movements(mtsUpdated, currency)`,
      `CREATE INDEX fundingOfferHistory_mtsUpdate_symbol
        ON fundingOfferHistory(mtsUpdate, symbol)`,
      `CREATE INDEX fundingLoanHistory_mtsUpdate_symbol
        ON fundingLoanHistory(mtsUpdate, symbol)`,
      `CREATE INDEX fundingCreditHistory_mtsUpdate_symbol
        ON fundingCreditHistory(mtsUpdate, symbol)`,
      `CREATE INDEX positionsHistory_mtsUpdate_symbol
        ON positionsHistory(mtsUpdate, symbol)`,
      `CREATE INDEX positionsSnapshot_mtsUpdate_symbol
        ON positionsSnapshot(mtsUpdate, symbol)`,
      `CREATE INDEX logins_time
        ON logins(time)`,
      `CREATE INDEX changeLogs_mtsCreate
        ON changeLogs(mtsCreate)`,
      `CREATE INDEX tickersHistory_mtsUpdate_symbol
        ON tickersHistory(mtsUpdate, symbol)`,
      `CREATE INDEX statusMessages_timestamp_key
        ON statusMessages(timestamp, key)`,
      `CREATE INDEX candles_mts__symbol
        ON candles(mts, _symbol)`
    ]

    this.addSql(sqlArr)
  }
}

module.exports = MigrationV19
