'use strict'

const SYNC_API_METHODS = require('../schema/sync.api.methods')
const TABLES_NAMES = require('../schema/tables-names')

module.exports = {
  [SYNC_API_METHODS.LEDGERS]: TABLES_NAMES.LEDGERS,
  [SYNC_API_METHODS.TRADES]: TABLES_NAMES.TRADES,
  [SYNC_API_METHODS.FUNDING_TRADES]: TABLES_NAMES.FUNDING_TRADES,
  [SYNC_API_METHODS.PUBLIC_TRADES]: TABLES_NAMES.PUBLIC_TRADES,
  [SYNC_API_METHODS.ORDERS]: TABLES_NAMES.ORDERS,
  [SYNC_API_METHODS.MOVEMENTS]: TABLES_NAMES.MOVEMENTS,
  [SYNC_API_METHODS.FUNDING_OFFER_HISTORY]: TABLES_NAMES.FUNDING_OFFER_HISTORY,
  [SYNC_API_METHODS.FUNDING_LOAN_HISTORY]: TABLES_NAMES.FUNDING_LOAN_HISTORY,
  [SYNC_API_METHODS.FUNDING_CREDIT_HISTORY]: TABLES_NAMES.FUNDING_CREDIT_HISTORY,
  [SYNC_API_METHODS.TICKERS_HISTORY]: TABLES_NAMES.TICKERS_HISTORY,
  [SYNC_API_METHODS.POSITIONS_HISTORY]: TABLES_NAMES.POSITIONS_HISTORY,
  [SYNC_API_METHODS.POSITIONS_SNAPSHOT]: TABLES_NAMES.POSITIONS_SNAPSHOT,
  [SYNC_API_METHODS.CANDLES]: TABLES_NAMES.CANDLES,
  [SYNC_API_METHODS.STATUS_MESSAGES]: TABLES_NAMES.STATUS_MESSAGES,
  [SYNC_API_METHODS.CHANGE_LOGS]: TABLES_NAMES.CHANGE_LOGS
}
