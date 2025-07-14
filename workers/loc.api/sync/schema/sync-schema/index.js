'use strict'

const SYNC_API_METHODS = require('../sync.api.methods')

const ledgers = require('./ledgers')
const trades = require('./trades')
const fundingTrades = require('./funding-trades')
const publicTrades = require('./public-trades')
const statusMessages = require('./status-messages')
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
const wallets = require('./wallets')
const symbols = require('./symbols')
const mapSymbols = require('./map-symbols')
const inactiveCurrencies = require('./inactive-currencies')
const inactiveSymbols = require('./inactive-symbols')
const futures = require('./futures')
const currencies = require('./currencies')
const marginCurrencyList = require('./margin-currency-list')
const candles = require('./candles')

const _methodCollMap = new Map([
  [SYNC_API_METHODS.LEDGERS, ledgers],
  [SYNC_API_METHODS.TRADES, trades],
  [SYNC_API_METHODS.FUNDING_TRADES, fundingTrades],
  [SYNC_API_METHODS.PUBLIC_TRADES, publicTrades],
  [SYNC_API_METHODS.STATUS_MESSAGES, statusMessages],
  [SYNC_API_METHODS.ORDERS, orders],
  [SYNC_API_METHODS.MOVEMENTS, movements],
  [SYNC_API_METHODS.FUNDING_OFFER_HISTORY, fundingOfferHistory],
  [SYNC_API_METHODS.FUNDING_LOAN_HISTORY, fundingLoanHistory],
  [SYNC_API_METHODS.FUNDING_CREDIT_HISTORY, fundingCreditHistory],
  [SYNC_API_METHODS.POSITIONS_HISTORY, positionsHistory],
  [SYNC_API_METHODS.POSITIONS_SNAPSHOT, positionsSnapshot],
  [SYNC_API_METHODS.LOGINS, logins],
  [SYNC_API_METHODS.CHANGE_LOGS, changeLogs],
  [SYNC_API_METHODS.PAY_INVOICE_LIST, payInvoiceList],
  [SYNC_API_METHODS.TICKERS_HISTORY, tickersHistory],
  [SYNC_API_METHODS.WALLETS, wallets],
  [SYNC_API_METHODS.SYMBOLS, symbols],
  [SYNC_API_METHODS.MAP_SYMBOLS, mapSymbols],
  [SYNC_API_METHODS.INACTIVE_CURRENCIES, inactiveCurrencies],
  [SYNC_API_METHODS.INACTIVE_SYMBOLS, inactiveSymbols],
  [SYNC_API_METHODS.FUTURES, futures],
  [SYNC_API_METHODS.CURRENCIES, currencies],
  [SYNC_API_METHODS.MARGIN_CURRENCY_LIST, marginCurrencyList],
  [SYNC_API_METHODS.CANDLES, candles]
])

const getMethodCollMap = (methodCollMap = _methodCollMap) => {
  return new Map(methodCollMap)
}

const getClonedMethodCollMap = (methodCollMap = _methodCollMap) => {
  return new Map([...methodCollMap].map(([key, schema]) => {
    return [key, schema.clone()]
  }))
}

module.exports = {
  getMethodCollMap,
  getClonedMethodCollMap
}
