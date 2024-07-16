'use strict'

/*
 * The version must be increased when DB schema is changed
 *
 * For each new DB version need to implement new migration
 * in the `workers/loc.api/sync/dao/db-migrations/sqlite-migrations` folder,
 * e.g. `migration.v1.js`, where `v1` is `SUPPORTED_DB_VERSION`
 */
const SUPPORTED_DB_VERSION = 41

const TABLES_NAMES = require('../tables-names')

const users = require('./users')
const subAccounts = require('./sub-accounts')
const ledgers = require('./ledgers')
const trades = require('./trades')
const fundingTrades = require('./funding-trades')
const publicTrades = require('./public-trades')
const orders = require('./orders')
const movements = require('./movements')
const fundingOfferHistory = require('./funding-offer-history')
const fundingLoanHistory = require('./funding-loan-history')
const fundingCreditHistory = require('./funding-credit-history')
const positionsHistory = require('./positions-history')
const positionsSnapshot = require('./positions-snapshot')
const logins = require('./logins')
const changeLogs = require('./change-logs')
const payInvoiceList = require('./pay-invoice-list')
const tickersHistory = require('./tickers-history')
const statusMessages = require('./status-messages')
const publicCollsConf = require('./public-colls-conf')
const symbols = require('./symbols')
const mapSymbols = require('./map-symbols')
const inactiveCurrencies = require('./inactive-currencies')
const inactiveSymbols = require('./inactive-symbols')
const futures = require('./futures')
const currencies = require('./currencies')
const marginCurrencyList = require('./margin-currency-list')
const candles = require('./candles')
const scheduler = require('./scheduler')
const syncMode = require('./sync-mode')
const progress = require('./progress')
const syncQueue = require('./sync-queue')
const syncUserSteps = require('./sync-user-steps')

const _models = new Map([
  [TABLES_NAMES.USERS, users],
  [TABLES_NAMES.SUB_ACCOUNTS, subAccounts],
  [TABLES_NAMES.LEDGERS, ledgers],
  [TABLES_NAMES.TRADES, trades],
  [TABLES_NAMES.FUNDING_TRADES, fundingTrades],
  [TABLES_NAMES.PUBLIC_TRADES, publicTrades],
  [TABLES_NAMES.ORDERS, orders],
  [TABLES_NAMES.MOVEMENTS, movements],
  [TABLES_NAMES.FUNDING_OFFER_HISTORY, fundingOfferHistory],
  [TABLES_NAMES.FUNDING_LOAN_HISTORY, fundingLoanHistory],
  [TABLES_NAMES.FUNDING_CREDIT_HISTORY, fundingCreditHistory],
  [TABLES_NAMES.POSITIONS_HISTORY, positionsHistory],
  [TABLES_NAMES.POSITIONS_SNAPSHOT, positionsSnapshot],
  [TABLES_NAMES.LOGINS, logins],
  [TABLES_NAMES.CHANGE_LOGS, changeLogs],
  [TABLES_NAMES.PAY_INVOICE_LIST, payInvoiceList],
  [TABLES_NAMES.TICKERS_HISTORY, tickersHistory],
  [TABLES_NAMES.STATUS_MESSAGES, statusMessages],
  [TABLES_NAMES.PUBLIC_COLLS_CONF, publicCollsConf],
  [TABLES_NAMES.SYMBOLS, symbols],
  [TABLES_NAMES.MAP_SYMBOLS, mapSymbols],
  [TABLES_NAMES.INACTIVE_CURRENCIES, inactiveCurrencies],
  [TABLES_NAMES.INACTIVE_SYMBOLS, inactiveSymbols],
  [TABLES_NAMES.FUTURES, futures],
  [TABLES_NAMES.CURRENCIES, currencies],
  [TABLES_NAMES.MARGIN_CURRENCY_LIST, marginCurrencyList],
  [TABLES_NAMES.CANDLES, candles],
  [TABLES_NAMES.SCHEDULER, scheduler],
  [TABLES_NAMES.SYNC_MODE, syncMode],
  [TABLES_NAMES.PROGRESS, progress],
  [TABLES_NAMES.SYNC_QUEUE, syncQueue],
  [TABLES_NAMES.SYNC_USER_STEPS, syncUserSteps]
])

const {
  getModelsMap: _getModelsMap,
  getModelOf: _getModelOf
} = require('../helpers')

const getModelsMap = (params = {}) => {
  return _getModelsMap({
    ...params,
    models: params?.models ?? _models
  })
}

const getModelOf = (tableName) => {
  return _getModelOf(tableName, _models)
}

module.exports = {
  SUPPORTED_DB_VERSION,
  getModelsMap,
  getModelOf
}
