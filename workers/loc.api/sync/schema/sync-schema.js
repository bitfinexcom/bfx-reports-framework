'use strict'

const TABLES_NAMES = require('./tables-names')
const ALLOWED_COLLS = require('./allowed.colls')
const SYNC_API_METHODS = require('./sync.api.methods')
const COLLS_TYPES = require('./colls.types')
const { cloneSchema } = require('./helpers')
const { getModelOf } = require('./models')

const getMethodCollMap = (methodCollMap = _methodCollMap) => {
  return cloneSchema(methodCollMap)
}

const _methodCollMap = new Map([
  [
    SYNC_API_METHODS.LEDGERS,
    {
      name: ALLOWED_COLLS.LEDGERS,
      maxLimit: 2500,
      dateFieldName: 'mts',
      symbolFieldName: 'currency',
      sort: [['mts', -1], ['id', -1]],
      hasNewData: false,
      start: [],
      isSyncRequiredAtLeastOnce: true,
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.LEDGERS)
    }
  ],
  [
    SYNC_API_METHODS.TRADES,
    {
      name: ALLOWED_COLLS.TRADES,
      maxLimit: 2500,
      dateFieldName: 'mtsCreate',
      symbolFieldName: 'symbol',
      sort: [['mtsCreate', -1]],
      hasNewData: false,
      start: [],
      isSyncRequiredAtLeastOnce: true,
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.TRADES)
    }
  ],
  [
    SYNC_API_METHODS.FUNDING_TRADES,
    {
      name: ALLOWED_COLLS.FUNDING_TRADES,
      maxLimit: 1000,
      dateFieldName: 'mtsCreate',
      symbolFieldName: 'symbol',
      sort: [['mtsCreate', -1]],
      hasNewData: false,
      start: [],
      isSyncRequiredAtLeastOnce: false,
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.FUNDING_TRADES)
    }
  ],
  [
    SYNC_API_METHODS.PUBLIC_TRADES,
    {
      name: ALLOWED_COLLS.PUBLIC_TRADES,
      maxLimit: 5000,
      dateFieldName: 'mts',
      symbolFieldName: '_symbol',
      sort: [['mts', -1]],
      hasNewData: false,
      start: [],
      confName: 'publicTradesConf',
      isSyncRequiredAtLeastOnce: false,
      type: COLLS_TYPES.PUBLIC_INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.PUBLIC_TRADES)
    }
  ],
  [
    SYNC_API_METHODS.STATUS_MESSAGES,
    {
      name: ALLOWED_COLLS.STATUS_MESSAGES,
      maxLimit: 5000,
      fields: [
        'key',
        'timestamp',
        'price',
        'priceSpot',
        'fundBal',
        'fundingAccrued',
        'fundingStep'
      ],
      dateFieldName: 'timestamp',
      symbolFieldName: 'key',
      sort: [['timestamp', -1]],
      hasNewData: true,
      confName: 'statusMessagesConf',
      isSyncRequiredAtLeastOnce: false,
      type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.STATUS_MESSAGES)
    }
  ],
  [
    SYNC_API_METHODS.ORDERS,
    {
      name: ALLOWED_COLLS.ORDERS,
      maxLimit: 2500,
      dateFieldName: 'mtsUpdate',
      symbolFieldName: 'symbol',
      sort: [['mtsUpdate', -1]],
      hasNewData: false,
      start: [],
      isSyncRequiredAtLeastOnce: false,
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.ORDERS)
    }
  ],
  [
    SYNC_API_METHODS.MOVEMENTS,
    {
      name: ALLOWED_COLLS.MOVEMENTS,
      maxLimit: 250,
      dateFieldName: 'mtsUpdated',
      symbolFieldName: 'currency',
      sort: [['mtsUpdated', -1]],
      hasNewData: false,
      start: [],
      isSyncRequiredAtLeastOnce: true,
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.MOVEMENTS)
    }
  ],
  [
    SYNC_API_METHODS.FUNDING_OFFER_HISTORY,
    {
      name: ALLOWED_COLLS.FUNDING_OFFER_HISTORY,
      maxLimit: 10000,
      dateFieldName: 'mtsUpdate',
      symbolFieldName: 'symbol',
      sort: [['mtsUpdate', -1]],
      hasNewData: false,
      start: [],
      isSyncRequiredAtLeastOnce: false,
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.FUNDING_OFFER_HISTORY)
    }
  ],
  [
    SYNC_API_METHODS.FUNDING_LOAN_HISTORY,
    {
      name: ALLOWED_COLLS.FUNDING_LOAN_HISTORY,
      maxLimit: 10000,
      dateFieldName: 'mtsUpdate',
      symbolFieldName: 'symbol',
      sort: [['mtsUpdate', -1]],
      hasNewData: false,
      start: [],
      isSyncRequiredAtLeastOnce: false,
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.FUNDING_LOAN_HISTORY)
    }
  ],
  [
    SYNC_API_METHODS.FUNDING_CREDIT_HISTORY,
    {
      name: ALLOWED_COLLS.FUNDING_CREDIT_HISTORY,
      maxLimit: 10000,
      dateFieldName: 'mtsUpdate',
      symbolFieldName: 'symbol',
      sort: [['mtsUpdate', -1]],
      hasNewData: false,
      start: [],
      isSyncRequiredAtLeastOnce: false,
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.FUNDING_CREDIT_HISTORY)
    }
  ],
  [
    SYNC_API_METHODS.POSITIONS_HISTORY,
    {
      name: ALLOWED_COLLS.POSITIONS_HISTORY,
      maxLimit: 10000,
      dateFieldName: 'mtsUpdate',
      symbolFieldName: 'symbol',
      sort: [['mtsUpdate', -1]],
      hasNewData: false,
      start: [],
      isSyncRequiredAtLeastOnce: false,
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.POSITIONS_HISTORY)
    }
  ],
  [
    SYNC_API_METHODS.POSITIONS_SNAPSHOT,
    {
      name: ALLOWED_COLLS.POSITIONS_SNAPSHOT,
      maxLimit: 10000,
      dateFieldName: 'mtsUpdate',
      symbolFieldName: 'symbol',
      sort: [['mtsUpdate', -1]],
      hasNewData: false,
      start: [],
      isSyncRequiredAtLeastOnce: false,
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.POSITIONS_SNAPSHOT)
    }
  ],
  [
    SYNC_API_METHODS.LOGINS,
    {
      name: ALLOWED_COLLS.LOGINS,
      maxLimit: 10000,
      dateFieldName: 'time',
      symbolFieldName: null,
      sort: [['time', -1]],
      hasNewData: false,
      start: [],
      isSyncRequiredAtLeastOnce: true,
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.LOGINS)
    }
  ],
  [
    SYNC_API_METHODS.CHANGE_LOGS,
    {
      name: ALLOWED_COLLS.CHANGE_LOGS,
      maxLimit: 10000,
      dateFieldName: 'mtsCreate',
      symbolFieldName: null,
      sort: [['mtsCreate', -1]],
      hasNewData: false,
      start: [],
      isSyncRequiredAtLeastOnce: false,
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.CHANGE_LOGS)
    }
  ],
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
      groupResBy: ['wallet', 'currency'],
      subQuery: {
        sort: [['mts', -1], ['id', -1]]
      },
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
      field: 'pairs',
      sort: [['pairs', 1]],
      hasNewData: true,
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
      fields: ['key', 'value'],
      sort: [['key', 1]],
      hasNewData: true,
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
      field: 'pairs',
      sort: [['pairs', 1]],
      hasNewData: true,
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
      field: 'pairs',
      sort: [['pairs', 1]],
      hasNewData: true,
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
      field: 'pairs',
      sort: [['pairs', 1]],
      hasNewData: true,
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
      fields: ['id'],
      sort: [['name', 1]],
      hasNewData: true,
      isSyncRequiredAtLeastOnce: true,
      type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.CURRENCIES)
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
      isSyncDoneForCurrencyConv: false,
      isSyncRequiredAtLeastOnce: true,
      type: COLLS_TYPES.PUBLIC_INSERTABLE_ARRAY_OBJECTS,
      model: getModelOf(TABLES_NAMES.CANDLES)
    }
  ]
])

module.exports = {
  getMethodCollMap
}
