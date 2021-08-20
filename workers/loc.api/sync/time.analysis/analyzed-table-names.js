'use strict'

const TABLES_NAMES = require('../schema/tables-names')

module.exports = [
  TABLES_NAMES.LEDGERS,
  TABLES_NAMES.TRADES,
  TABLES_NAMES.FUNDING_TRADES,
  TABLES_NAMES.PUBLIC_TRADES,
  TABLES_NAMES.ORDERS,
  TABLES_NAMES.MOVEMENTS,
  TABLES_NAMES.FUNDING_OFFER_HISTORY,
  TABLES_NAMES.FUNDING_LOAN_HISTORY,
  TABLES_NAMES.FUNDING_CREDIT_HISTORY,
  TABLES_NAMES.TICKERS_HISTORY,
  TABLES_NAMES.POSITIONS_HISTORY,
  TABLES_NAMES.POSITIONS_SNAPSHOT,
  TABLES_NAMES.CANDLES,
  TABLES_NAMES.STATUS_MESSAGES,
  TABLES_NAMES.CHANGE_LOGS
]
