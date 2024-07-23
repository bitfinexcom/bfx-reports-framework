'use strict'

const TABLES_NAMES = require('../tables-names')
const ALLOWED_COLLS = require('../allowed.colls')
const SYNC_API_METHODS = require('../sync.api.methods')
const COLLS_TYPES = require('../colls.types')

const { cloneSchema } = require('../helpers')
const { getModelOf } = require('../models')

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
  [
    SYNC_API_METHODS.TICKERS_HISTORY,
    {
      name: ALLOWED_COLLS.TICKERS_HISTORY,
      maxLimit: 10000,
      dateFieldName: 'mtsUpdate',
      symbolFieldName: 'symbol',
      sort: [['mtsUpdate', -1]],
      hasNewData: false,
      start: [],
      confName: 'tickersHistoryConf',
      isSyncRequiredAtLeastOnce: false,
      additionalApiCallArgs: { isNotMoreThanInnerMax: true },
      type: COLLS_TYPES.PUBLIC_INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.TICKERS_HISTORY)
    }
  ],
  [
    SYNC_API_METHODS.WALLETS,
    {
      name: ALLOWED_COLLS.LEDGERS,
      dateFieldName: 'mts',
      symbolFieldName: 'currency',
      sort: [['mts', -1]],
      groupFns: ['max(mts)', 'max(id)'],
      groupResBy: ['wallet', 'currency'],
      isSyncRequiredAtLeastOnce: true,
      type: COLLS_TYPES.HIDDEN_INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.LEDGERS),
      dataStructureConverter: (accum, {
        wallet: type,
        currency,
        balance,
        mts: mtsUpdate
      } = {}) => {
        accum.push({
          type,
          currency,
          balance,
          unsettledInterest: null,
          balanceAvailable: null,
          placeHolder: null,
          mtsUpdate
        })

        return accum
      }
    }
  ],
  [
    SYNC_API_METHODS.SYMBOLS,
    {
      name: ALLOWED_COLLS.SYMBOLS,
      maxLimit: 10000,
      projection: 'pairs',
      sort: [['pairs', 1]],
      hasNewData: false,
      isSyncRequiredAtLeastOnce: true,
      type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY,
      model: getModelOf(TABLES_NAMES.SYMBOLS)
    }
  ],
  [
    SYNC_API_METHODS.MAP_SYMBOLS,
    {
      name: ALLOWED_COLLS.MAP_SYMBOLS,
      maxLimit: 10000,
      projection: ['key', 'value'],
      sort: [['key', 1]],
      hasNewData: false,
      isSyncRequiredAtLeastOnce: true,
      type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.MAP_SYMBOLS)
    }
  ],
  [
    SYNC_API_METHODS.INACTIVE_CURRENCIES,
    {
      name: ALLOWED_COLLS.INACTIVE_CURRENCIES,
      maxLimit: 10000,
      projection: 'pairs',
      sort: [['pairs', 1]],
      hasNewData: false,
      isSyncRequiredAtLeastOnce: true,
      type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY,
      model: getModelOf(TABLES_NAMES.INACTIVE_CURRENCIES)
    }
  ],
  [
    SYNC_API_METHODS.INACTIVE_SYMBOLS,
    {
      name: ALLOWED_COLLS.INACTIVE_SYMBOLS,
      maxLimit: 10000,
      projection: 'pairs',
      sort: [['pairs', 1]],
      hasNewData: false,
      isSyncRequiredAtLeastOnce: true,
      type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY,
      model: getModelOf(TABLES_NAMES.INACTIVE_SYMBOLS)
    }
  ],
  [
    SYNC_API_METHODS.FUTURES,
    {
      name: ALLOWED_COLLS.FUTURES,
      maxLimit: 10000,
      projection: 'pairs',
      sort: [['pairs', 1]],
      hasNewData: false,
      isSyncRequiredAtLeastOnce: true,
      type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY,
      model: getModelOf(TABLES_NAMES.FUTURES)
    }
  ],
  [
    SYNC_API_METHODS.CURRENCIES,
    {
      name: ALLOWED_COLLS.CURRENCIES,
      maxLimit: 10000,
      projection: null,
      sort: [['name', 1]],
      hasNewData: false,
      isSyncRequiredAtLeastOnce: true,
      type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.CURRENCIES)
    }
  ],
  [
    SYNC_API_METHODS.MARGIN_CURRENCY_LIST,
    {
      name: ALLOWED_COLLS.MARGIN_CURRENCY_LIST,
      maxLimit: 10000,
      projection: 'symbol',
      sort: [['symbol', 1]],
      hasNewData: false,
      isSyncRequiredAtLeastOnce: true,
      type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY,
      model: getModelOf(TABLES_NAMES.MARGIN_CURRENCY_LIST)
    }
  ],
  [
    SYNC_API_METHODS.CANDLES,
    {
      name: ALLOWED_COLLS.CANDLES,
      maxLimit: 10000,
      dateFieldName: 'mts',
      symbolFieldName: '_symbol',
      timeframeFieldName: '_timeframe',
      sort: [['mts', -1]],
      hasNewData: false,
      start: [],
      confName: 'candlesConf',
      isSyncRequiredAtLeastOnce: true,
      additionalApiCallArgs: { isNotMoreThanInnerMax: true },
      type: COLLS_TYPES.PUBLIC_INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.CANDLES)
    }
  ]
])

const getMethodCollMap = (methodCollMap = _methodCollMap) => {
  return cloneSchema(methodCollMap)
}

module.exports = {
  getMethodCollMap
}
