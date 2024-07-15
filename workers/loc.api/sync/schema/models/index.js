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

const {
  CONSTR_FIELD_NAME,
  TRIGGER_FIELD_NAME,
  INDEX_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('../const')
const {
  CREATE_UPDATE_MTS_TRIGGERS
} = require('../common.triggers')
const {
  USER_ID_CONSTRAINT,
  OWNER_USER_ID_CONSTRAINT,
  SUB_USER_ID_CONSTRAINT
} = require('../common.constraints')
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

const _models = new Map([
  [
    TABLES_NAMES.USERS,
    users
  ],
  [
    TABLES_NAMES.SUB_ACCOUNTS,
    subAccounts
  ],
  [
    TABLES_NAMES.LEDGERS,
    ledgers
  ],
  [
    TABLES_NAMES.TRADES,
    trades
  ],
  [
    TABLES_NAMES.FUNDING_TRADES,
    fundingTrades
  ],
  [
    TABLES_NAMES.PUBLIC_TRADES,
    publicTrades
  ],
  [
    TABLES_NAMES.ORDERS,
    orders
  ],
  [
    TABLES_NAMES.MOVEMENTS,
    movements
  ],
  [
    TABLES_NAMES.FUNDING_OFFER_HISTORY,
    fundingOfferHistory
  ],
  [
    TABLES_NAMES.FUNDING_LOAN_HISTORY,
    fundingLoanHistory
  ],
  [
    TABLES_NAMES.FUNDING_CREDIT_HISTORY,
    fundingCreditHistory
  ],
  [
    TABLES_NAMES.POSITIONS_HISTORY,
    positionsHistory
  ],
  [
    TABLES_NAMES.POSITIONS_SNAPSHOT,
    positionsSnapshot
  ],
  [
    TABLES_NAMES.LOGINS,
    logins
  ],
  [
    TABLES_NAMES.CHANGE_LOGS,
    {
      _id: ID_PRIMARY_KEY,
      mtsCreate: 'BIGINT',
      log: 'VARCHAR(255)',
      ip: 'VARCHAR(255)',
      userAgent: 'TEXT',
      subUserId: 'INT',
      user_id: 'INT NOT NULL',

      [UNIQUE_INDEX_FIELD_NAME]: ['mtsCreate', 'log', 'user_id'],
      [INDEX_FIELD_NAME]: [
        ['user_id', 'mtsCreate'],
        ['user_id', 'subUserId', 'mtsCreate',
          'WHERE subUserId IS NOT NULL']
      ],
      [CONSTR_FIELD_NAME]: [
        USER_ID_CONSTRAINT,
        SUB_USER_ID_CONSTRAINT
      ]
    }
  ],
  [
    TABLES_NAMES.PAY_INVOICE_LIST,
    {
      _id: ID_PRIMARY_KEY,
      id: 'VARCHAR(255)',
      t: 'BIGINT',
      duration: 'INT',
      amount: 'DECIMAL(22,12)',
      currency: 'VARCHAR(255)',
      orderId: 'VARCHAR(255)',
      payCurrencies: 'TEXT', // JSON
      webhook: 'VARCHAR(255)',
      redirectUrl: 'VARCHAR(255)',
      status: 'VARCHAR(255)',
      customerInfo: 'TEXT', // JSON
      invoices: 'TEXT', // JSON
      payment: 'TEXT', // JSON
      merchantName: 'VARCHAR(255)',
      subUserId: 'INT',
      user_id: 'INT NOT NULL',

      [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
      [INDEX_FIELD_NAME]: [
        ['user_id', 'currency', 't'],
        ['user_id', 'id', 't'],
        ['user_id', 't'],
        ['user_id', 'subUserId', 't',
          'WHERE subUserId IS NOT NULL'],
        ['subUserId', 'id',
          'WHERE subUserId IS NOT NULL']
      ],
      [CONSTR_FIELD_NAME]: [
        USER_ID_CONSTRAINT,
        SUB_USER_ID_CONSTRAINT
      ]
    }
  ],
  [
    TABLES_NAMES.TICKERS_HISTORY,
    {
      _id: ID_PRIMARY_KEY,
      symbol: 'VARCHAR(255)',
      bid: 'DECIMAL(22,12)',
      bidPeriod: 'INT',
      ask: 'DECIMAL(22,12)',
      mtsUpdate: 'BIGINT',

      [UNIQUE_INDEX_FIELD_NAME]: ['mtsUpdate', 'symbol'],
      [INDEX_FIELD_NAME]: [
        ['symbol', 'mtsUpdate']
      ]
    }
  ],
  [
    TABLES_NAMES.STATUS_MESSAGES,
    {
      _id: ID_PRIMARY_KEY,
      key: 'VARCHAR(255)',
      timestamp: 'BIGINT',
      price: 'DECIMAL(22,12)',
      priceSpot: 'DECIMAL(22,12)',
      fundBal: 'DECIMAL(22,12)',
      fundingAccrued: 'DECIMAL(22,12)',
      fundingStep: 'DECIMAL(22,12)',
      clampMin: 'DECIMAL(22,12)',
      clampMax: 'DECIMAL(22,12)',
      _type: 'VARCHAR(255)',

      [UNIQUE_INDEX_FIELD_NAME]: ['key', '_type'],
      [INDEX_FIELD_NAME]: [
        ['key', 'timestamp']
      ]
    }
  ],
  [
    TABLES_NAMES.PUBLIC_COLLS_CONF,
    {
      _id: ID_PRIMARY_KEY,
      confName: 'VARCHAR(255)',
      symbol: 'VARCHAR(255)',
      start: 'BIGINT',
      timeframe: 'VARCHAR(255)',
      createdAt: 'BIGINT',
      updatedAt: 'BIGINT',
      user_id: 'INT NOT NULL',

      [UNIQUE_INDEX_FIELD_NAME]: [
        'symbol', 'user_id', 'confName', 'timeframe'
      ],
      [CONSTR_FIELD_NAME]: USER_ID_CONSTRAINT,
      [TRIGGER_FIELD_NAME]: CREATE_UPDATE_MTS_TRIGGERS
    }
  ],
  [
    TABLES_NAMES.SYMBOLS,
    {
      _id: ID_PRIMARY_KEY,
      pairs: 'VARCHAR(255)',

      [UNIQUE_INDEX_FIELD_NAME]: ['pairs']
    }
  ],
  [
    TABLES_NAMES.MAP_SYMBOLS,
    {
      _id: ID_PRIMARY_KEY,
      key: 'VARCHAR(255)',
      value: 'VARCHAR(255)',

      [UNIQUE_INDEX_FIELD_NAME]: ['key']
    }
  ],
  [
    TABLES_NAMES.INACTIVE_CURRENCIES,
    {
      _id: ID_PRIMARY_KEY,
      pairs: 'VARCHAR(255)',

      [UNIQUE_INDEX_FIELD_NAME]: ['pairs']
    }
  ],
  [
    TABLES_NAMES.INACTIVE_SYMBOLS,
    {
      _id: ID_PRIMARY_KEY,
      pairs: 'VARCHAR(255)',

      [UNIQUE_INDEX_FIELD_NAME]: ['pairs']
    }
  ],
  [
    TABLES_NAMES.FUTURES,
    {
      _id: ID_PRIMARY_KEY,
      pairs: 'VARCHAR(255)',

      [UNIQUE_INDEX_FIELD_NAME]: ['pairs']
    }
  ],
  [
    TABLES_NAMES.CURRENCIES,
    {
      _id: ID_PRIMARY_KEY,
      id: 'VARCHAR(255)',
      name: 'VARCHAR(255)',
      pool: 'VARCHAR(255)',
      explorer: 'TEXT',
      symbol: 'VARCHAR(255)',
      walletFx: 'TEXT',

      [UNIQUE_INDEX_FIELD_NAME]: ['id']
    }
  ],
  [
    TABLES_NAMES.MARGIN_CURRENCY_LIST,
    {
      _id: ID_PRIMARY_KEY,
      symbol: 'VARCHAR(255)',

      [UNIQUE_INDEX_FIELD_NAME]: ['symbol']
    }
  ],
  [
    TABLES_NAMES.CANDLES,
    {
      _id: ID_PRIMARY_KEY,
      mts: 'BIGINT',
      open: 'DECIMAL(22,12)',
      close: 'DECIMAL(22,12)',
      high: 'DECIMAL(22,12)',
      low: 'DECIMAL(22,12)',
      volume: 'DECIMAL(22,12)',
      _symbol: 'VARCHAR(255)',
      _timeframe: 'VARCHAR(255)',

      [UNIQUE_INDEX_FIELD_NAME]: ['_symbol', '_timeframe', 'mts'],
      [INDEX_FIELD_NAME]: [
        ['_timeframe', '_symbol', 'mts'],
        ['_timeframe', 'mts'],
        ['_symbol', 'mts'],
        ['close', 'mts']
      ]
    }
  ],
  [
    TABLES_NAMES.SCHEDULER,
    {
      _id: ID_PRIMARY_KEY,
      isEnable: 'INT',
      createdAt: 'BIGINT',
      updatedAt: 'BIGINT',

      [TRIGGER_FIELD_NAME]: CREATE_UPDATE_MTS_TRIGGERS
    }
  ],
  [
    TABLES_NAMES.SYNC_MODE,
    {
      _id: ID_PRIMARY_KEY,
      isEnable: 'INT',
      createdAt: 'BIGINT',
      updatedAt: 'BIGINT',

      [TRIGGER_FIELD_NAME]: CREATE_UPDATE_MTS_TRIGGERS
    }
  ],
  [
    TABLES_NAMES.PROGRESS,
    {
      _id: ID_PRIMARY_KEY,
      error: 'VARCHAR(255)',
      value: 'DECIMAL(22,12)',
      state: 'VARCHAR(255)',
      createdAt: 'BIGINT',
      updatedAt: 'BIGINT',

      [TRIGGER_FIELD_NAME]: CREATE_UPDATE_MTS_TRIGGERS
    }
  ],
  [
    TABLES_NAMES.SYNC_QUEUE,
    {
      _id: ID_PRIMARY_KEY,
      collName: 'VARCHAR(255) NOT NULL',
      state: 'VARCHAR(255)',
      createdAt: 'BIGINT',
      updatedAt: 'BIGINT',
      ownerUserId: 'INT',
      isOwnerScheduler: 'INT',

      [CONSTR_FIELD_NAME]: OWNER_USER_ID_CONSTRAINT,
      [TRIGGER_FIELD_NAME]: CREATE_UPDATE_MTS_TRIGGERS
    }
  ],
  [
    TABLES_NAMES.SYNC_USER_STEPS,
    {
      _id: ID_PRIMARY_KEY,
      collName: 'VARCHAR(255) NOT NULL',
      syncedAt: 'BIGINT',
      baseStart: 'BIGINT',
      baseEnd: 'BIGINT',
      isBaseStepReady: 'INT',
      currStart: 'BIGINT',
      currEnd: 'BIGINT',
      isCurrStepReady: 'INT',
      createdAt: 'BIGINT',
      updatedAt: 'BIGINT',
      subUserId: 'INT',
      user_id: 'INT',
      syncQueueId: 'INT',

      [UNIQUE_INDEX_FIELD_NAME]: [
        // It needs to cover public collections
        ['collName',
          'WHERE user_id IS NULL'],
        // It needs to cover private collections
        ['user_id', 'collName',
          'WHERE user_id IS NOT NULL AND subUserId IS NULL'],
        // It needs to cover private collections of sub-account
        ['user_id', 'subUserId', 'collName',
          'WHERE user_id IS NOT NULL AND subUserId IS NOT NULL']
      ],
      [CONSTR_FIELD_NAME]: [
        USER_ID_CONSTRAINT,
        SUB_USER_ID_CONSTRAINT
      ],
      [TRIGGER_FIELD_NAME]: CREATE_UPDATE_MTS_TRIGGERS
    }
  ]
])

module.exports = {
  SUPPORTED_DB_VERSION,
  getModelsMap,
  getModelOf
}
