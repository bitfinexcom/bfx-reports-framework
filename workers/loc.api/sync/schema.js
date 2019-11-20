'use strict'

/**
 * The version must be increased when DB schema is chenged
 */
const SUPPORTED_DB_VERSION = 1

const { cloneDeep } = require('lodash')

const TABLES_NAMES = require('./dao/tables-names')
const ALLOWED_COLLS = require('./allowed.colls')

const _models = new Map([
  [
    TABLES_NAMES.DB_CONFIGS,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      version: 'INT'
    }
  ],
  [
    TABLES_NAMES.USERS,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      id: 'BIGINT',
      email: 'VARCHAR(255)',
      apiKey: 'VARCHAR(255)',
      apiSecret: 'VARCHAR(255)',
      active: 'INT',
      isDataFromDb: 'INT',
      timezone: 'VARCHAR(255)',
      username: 'VARCHAR(255)'
    }
  ],
  [
    TABLES_NAMES.LEDGERS,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      id: 'BIGINT',
      currency: 'VARCHAR(255)',
      mts: 'BIGINT',
      amount: 'DECIMAL(22,12)',
      amountUsd: 'DECIMAL(22,12)',
      balance: 'DECIMAL(22,12)',
      balanceUsd: 'DECIMAL(22,12)',
      description: 'TEXT',
      wallet: 'VARCHAR(255)',
      _isMarginFundingPayment: 'INT',
      _isAffiliateRebate: 'INT',
      user_id: `INT NOT NULL,
        CONSTRAINT ledgers_fk_#{field}
        FOREIGN KEY (#{field})
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.TRADES,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      id: 'BIGINT',
      symbol: 'VARCHAR(255)',
      mtsCreate: 'BIGINT',
      orderID: 'BIGINT',
      execAmount: 'DECIMAL(22,12)',
      execPrice: 'DECIMAL(22,12)',
      orderType: 'VARCHAR(255)',
      orderPrice: 'DECIMAL(22,12)',
      maker: 'INT',
      fee: 'DECIMAL(22,12)',
      feeCurrency: 'VARCHAR(255)',
      user_id: `INT NOT NULL,
        CONSTRAINT trades_fk_#{field}
        FOREIGN KEY (#{field})
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.FUNDING_TRADES,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      id: 'BIGINT',
      symbol: 'VARCHAR(255)',
      mtsCreate: 'BIGINT',
      offerID: 'BIGINT',
      amount: 'DECIMAL(22,12)',
      rate: 'DECIMAL(22,12)',
      period: 'BIGINT',
      maker: 'INT',
      user_id: `INT NOT NULL,
        CONSTRAINT fundingTrades_fk_#{field}
        FOREIGN KEY (#{field})
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.PUBLIC_TRADES,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      id: 'BIGINT',
      mts: 'BIGINT',
      rate: 'DECIMAL(22,12)',
      period: 'BIGINT',
      amount: 'DECIMAL(22,12)',
      price: 'DECIMAL(22,12)',
      _symbol: 'VARCHAR(255)'
    }
  ],
  [
    TABLES_NAMES.ORDERS,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      id: 'BIGINT',
      gid: 'BIGINT',
      cid: 'BIGINT',
      symbol: 'VARCHAR(255)',
      mtsCreate: 'BIGINT',
      mtsUpdate: 'BIGINT',
      amount: 'DECIMAL(22,12)',
      amountOrig: 'DECIMAL(22,12)',
      type: 'VARCHAR(255)',
      typePrev: 'VARCHAR(255)',
      flags: 'INT',
      status: 'VARCHAR(255)',
      price: 'DECIMAL(22,12)',
      priceAvg: 'DECIMAL(22,12)',
      priceTrailing: 'DECIMAL(22,12)',
      priceAuxLimit: 'DECIMAL(22,12)',
      notify: 'INT',
      placedId: 'BIGINT',
      _lastAmount: 'DECIMAL(22,12)',
      amountExecuted: 'DECIMAL(22,12)',
      user_id: `INT NOT NULL,
        CONSTRAINT orders_fk_#{field}
        FOREIGN KEY (#{field})
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.MOVEMENTS,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      id: 'BIGINT',
      currency: 'VARCHAR(255)',
      currencyName: 'VARCHAR(255)',
      mtsStarted: 'BIGINT',
      mtsUpdated: 'BIGINT',
      status: 'VARCHAR(255)',
      amount: 'DECIMAL(22,12)',
      amountUsd: 'DECIMAL(22,12)',
      fees: 'DECIMAL(22,12)',
      destinationAddress: 'VARCHAR(255)',
      transactionId: 'VARCHAR(255)',
      user_id: `INT NOT NULL,
        CONSTRAINT movements_fk_#{field}
        FOREIGN KEY (#{field})
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.FUNDING_OFFER_HISTORY,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      id: 'BIGINT',
      symbol: 'VARCHAR(255)',
      mtsCreate: 'BIGINT',
      mtsUpdate: 'BIGINT',
      amount: 'DECIMAL(22,12)',
      amountOrig: 'DECIMAL(22,12)',
      type: 'VARCHAR(255)',
      flags: 'TEXT',
      status: 'TEXT',
      rate: 'VARCHAR(255)',
      period: 'INT',
      notify: 'INT',
      hidden: 'INT',
      renew: 'INT',
      rateReal: 'INT',
      amountExecuted: 'DECIMAL(22,12)',
      user_id: `INT NOT NULL,
        CONSTRAINT fundingOfferHistory_fk_#{field}
        FOREIGN KEY (#{field})
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.FUNDING_LOAN_HISTORY,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      id: 'BIGINT',
      symbol: 'VARCHAR(255)',
      side: 'INT',
      mtsCreate: 'BIGINT',
      mtsUpdate: 'BIGINT',
      amount: 'DECIMAL(22,12)',
      flags: 'TEXT',
      status: 'TEXT',
      rate: 'VARCHAR(255)',
      period: 'INT',
      mtsOpening: 'BIGINT',
      mtsLastPayout: 'BIGINT',
      notify: 'INT',
      hidden: 'INT',
      renew: 'INT',
      rateReal: 'INT',
      noClose: 'INT',
      user_id: `INT NOT NULL,
        CONSTRAINT fundingLoanHistory_fk_#{field}
        FOREIGN KEY (#{field})
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.FUNDING_CREDIT_HISTORY,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      id: 'BIGINT',
      symbol: 'VARCHAR(255)',
      side: 'INT',
      mtsCreate: 'BIGINT',
      mtsUpdate: 'BIGINT',
      amount: 'DECIMAL(22,12)',
      flags: 'TEXT',
      status: 'TEXT',
      rate: 'VARCHAR(255)',
      period: 'INT',
      mtsOpening: 'BIGINT',
      mtsLastPayout: 'BIGINT',
      notify: 'INT',
      hidden: 'INT',
      renew: 'INT',
      rateReal: 'INT',
      noClose: 'INT',
      positionPair: 'VARCHAR(255)',
      user_id: `INT NOT NULL,
        CONSTRAINT fundingCreditHistory_fk_#{field}
        FOREIGN KEY (#{field})
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.POSITIONS_HISTORY,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      id: 'BIGINT',
      symbol: 'VARCHAR(255)',
      status: 'VARCHAR(255)',
      amount: 'DECIMAL(22,12)',
      basePrice: 'DECIMAL(22,12)',
      closePrice: 'DECIMAL(22,12)',
      marginFunding: 'DECIMAL(22,12)',
      marginFundingType: 'INT',
      pl: 'DECIMAL(22,12)',
      plPerc: 'DECIMAL(22,12)',
      liquidationPrice: 'DECIMAL(22,12)',
      leverage: 'DECIMAL(22,12)',
      placeholder: 'TEXT',
      mtsCreate: 'BIGINT',
      mtsUpdate: 'BIGINT',
      user_id: `INT NOT NULL,
        CONSTRAINT positionsHistory_fk_#{field}
        FOREIGN KEY (#{field})
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.TICKERS_HISTORY,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      symbol: 'VARCHAR(255)',
      bid: 'DECIMAL(22,12)',
      bidPeriod: 'INT',
      ask: 'DECIMAL(22,12)',
      mtsUpdate: 'BIGINT'
    }
  ],
  [
    TABLES_NAMES.STATUS_MESSAGES,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      key: 'VARCHAR(255)',
      timestamp: 'BIGINT',
      price: 'DECIMAL(22,12)',
      priceSpot: 'DECIMAL(22,12)',
      fundBal: 'DECIMAL(22,12)',
      fundingAccrued: 'DECIMAL(22,12)',
      fundingStep: 'DECIMAL(22,12)',
      _type: 'VARCHAR(255)'
    }
  ],
  [
    TABLES_NAMES.PUBLIC_COLLS_CONF,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      confName: 'VARCHAR(255)',
      symbol: 'VARCHAR(255)',
      start: 'BIGINT',
      user_id: `INT NOT NULL,
        CONSTRAINT publicСollsСonf_fk_#{field}
        FOREIGN KEY (#{field})
        REFERENCES users(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.SYMBOLS,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      pairs: 'VARCHAR(255)'
    }
  ],
  [
    TABLES_NAMES.FUTURES,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      pairs: 'VARCHAR(255)'
    }
  ],
  [
    TABLES_NAMES.CURRENCIES,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      id: 'VARCHAR(255)',
      name: 'VARCHAR(255)',
      pool: 'VARCHAR(255)',
      explorer: 'TEXT'
    }
  ],
  [
    TABLES_NAMES.CANDLES,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      mts: 'BIGINT',
      open: 'DECIMAL(22,12)',
      close: 'DECIMAL(22,12)',
      high: 'DECIMAL(22,12)',
      low: 'DECIMAL(22,12)',
      volume: 'DECIMAL(22,12)',
      _symbol: 'VARCHAR(255)'
    }
  ],
  [
    TABLES_NAMES.SCHEDULER,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      isEnable: 'INT'
    }
  ],
  [
    TABLES_NAMES.SYNC_MODE,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      isEnable: 'INT'
    }
  ],
  [
    TABLES_NAMES.PROGRESS,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      value: 'VARCHAR(255)'
    }
  ],
  [
    TABLES_NAMES.SYNC_QUEUE,
    {
      _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
      collName: 'VARCHAR(255)',
      state: 'VARCHAR(255)'
    }
  ]
])

const _methodCollMap = new Map([
  [
    '_getLedgers',
    {
      name: ALLOWED_COLLS.LEDGERS,
      maxLimit: 5000,
      dateFieldName: 'mts',
      symbolFieldName: 'currency',
      sort: [['mts', -1]],
      hasNewData: false,
      start: 0,
      type: 'insertable:array:objects',
      fieldsOfUniqueIndex: ['id', 'mts'],
      model: { ..._models.get(TABLES_NAMES.LEDGERS) }
    }
  ],
  [
    '_getTrades',
    {
      name: ALLOWED_COLLS.TRADES,
      maxLimit: 1500,
      dateFieldName: 'mtsCreate',
      symbolFieldName: 'symbol',
      sort: [['mtsCreate', -1]],
      hasNewData: false,
      start: 0,
      type: 'insertable:array:objects',
      fieldsOfUniqueIndex: ['id', 'mtsCreate', 'orderID', 'fee'],
      model: { ..._models.get(TABLES_NAMES.TRADES) }
    }
  ],
  [
    '_getFundingTrades',
    {
      name: ALLOWED_COLLS.FUNDING_TRADES,
      maxLimit: 1000,
      dateFieldName: 'mtsCreate',
      symbolFieldName: 'symbol',
      sort: [['mtsCreate', -1]],
      hasNewData: false,
      start: 0,
      type: 'insertable:array:objects',
      fieldsOfUniqueIndex: ['id', 'mtsCreate', 'offerID'],
      model: { ..._models.get(TABLES_NAMES.FUNDING_TRADES) }
    }
  ],
  [
    '_getPublicTrades',
    {
      name: ALLOWED_COLLS.PUBLIC_TRADES,
      maxLimit: 1000,
      dateFieldName: 'mts',
      symbolFieldName: '_symbol',
      sort: [['mts', -1]],
      hasNewData: false,
      start: [],
      confName: 'publicTradesConf',
      type: 'public:insertable:array:objects',
      fieldsOfUniqueIndex: ['id', 'mts', '_symbol'],
      model: { ..._models.get(TABLES_NAMES.PUBLIC_TRADES) }
    }
  ],
  [
    '_getStatusMessages',
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
      type: 'public:updatable:array:objects',
      fieldsOfUniqueIndex: ['timestamp', 'key', '_type'],
      model: { ..._models.get(TABLES_NAMES.STATUS_MESSAGES) }
    }
  ],
  [
    '_getOrders',
    {
      name: ALLOWED_COLLS.ORDERS,
      maxLimit: 5000,
      dateFieldName: 'mtsUpdate',
      symbolFieldName: 'symbol',
      sort: [['mtsUpdate', -1]],
      hasNewData: false,
      start: 0,
      type: 'insertable:array:objects',
      fieldsOfUniqueIndex: ['id', 'mtsUpdate'],
      model: { ..._models.get(TABLES_NAMES.ORDERS) }
    }
  ],
  [
    '_getMovements',
    {
      name: ALLOWED_COLLS.MOVEMENTS,
      maxLimit: 25,
      dateFieldName: 'mtsUpdated',
      symbolFieldName: 'currency',
      sort: [['mtsUpdated', -1]],
      hasNewData: false,
      start: 0,
      type: 'insertable:array:objects',
      fieldsOfUniqueIndex: ['id', 'mtsUpdated'],
      model: { ..._models.get(TABLES_NAMES.MOVEMENTS) }
    }
  ],
  [
    '_getFundingOfferHistory',
    {
      name: ALLOWED_COLLS.FUNDING_OFFER_HISTORY,
      maxLimit: 5000,
      dateFieldName: 'mtsUpdate',
      symbolFieldName: 'symbol',
      sort: [['mtsUpdate', -1]],
      hasNewData: false,
      start: 0,
      type: 'insertable:array:objects',
      fieldsOfUniqueIndex: ['id', 'mtsUpdate'],
      model: { ..._models.get(TABLES_NAMES.FUNDING_OFFER_HISTORY) }
    }
  ],
  [
    '_getFundingLoanHistory',
    {
      name: ALLOWED_COLLS.FUNDING_LOAN_HISTORY,
      maxLimit: 5000,
      dateFieldName: 'mtsUpdate',
      symbolFieldName: 'symbol',
      sort: [['mtsUpdate', -1]],
      hasNewData: false,
      start: 0,
      type: 'insertable:array:objects',
      fieldsOfUniqueIndex: ['id', 'mtsUpdate'],
      model: { ..._models.get(TABLES_NAMES.FUNDING_LOAN_HISTORY) }
    }
  ],
  [
    '_getFundingCreditHistory',
    {
      name: ALLOWED_COLLS.FUNDING_CREDIT_HISTORY,
      maxLimit: 5000,
      dateFieldName: 'mtsUpdate',
      symbolFieldName: 'symbol',
      sort: [['mtsUpdate', -1]],
      hasNewData: false,
      start: 0,
      type: 'insertable:array:objects',
      fieldsOfUniqueIndex: ['id', 'mtsUpdate'],
      model: { ..._models.get(TABLES_NAMES.FUNDING_CREDIT_HISTORY) }
    }
  ],
  [
    '_getPositionsHistory',
    {
      name: ALLOWED_COLLS.POSITIONS_HISTORY,
      maxLimit: 500,
      dateFieldName: 'mtsUpdate',
      symbolFieldName: 'symbol',
      sort: [['mtsUpdate', -1]],
      hasNewData: false,
      start: 0,
      type: 'insertable:array:objects',
      fieldsOfUniqueIndex: ['id', 'mtsUpdate'],
      model: { ..._models.get(TABLES_NAMES.POSITIONS_HISTORY) }
    }
  ],
  [
    '_getTickersHistory',
    {
      name: ALLOWED_COLLS.TICKERS_HISTORY,
      maxLimit: 2500,
      dateFieldName: 'mtsUpdate',
      symbolFieldName: 'symbol',
      sort: [['mtsUpdate', -1]],
      hasNewData: false,
      start: [],
      confName: 'tickersHistoryConf',
      type: 'public:insertable:array:objects',
      fieldsOfUniqueIndex: ['mtsUpdate', 'symbol'],
      model: { ..._models.get(TABLES_NAMES.TICKERS_HISTORY) }
    }
  ],
  [
    '_getWallets',
    {
      name: ALLOWED_COLLS.LEDGERS,
      dateFieldName: 'mts',
      symbolFieldName: 'currency',
      sort: [['mts', -1]],
      groupResBy: ['wallet', 'currency'],
      subQuery: {
        sort: [['mts', 1], ['id', 1]]
      },
      type: 'hidden:insertable:array:objects',
      model: { ..._models.get(TABLES_NAMES.LEDGERS) },
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
    '_getSymbols',
    {
      name: ALLOWED_COLLS.SYMBOLS,
      maxLimit: 5000,
      field: 'pairs',
      sort: [['pairs', 1]],
      hasNewData: true,
      type: 'public:updatable:array',
      model: { ..._models.get(TABLES_NAMES.SYMBOLS) }
    }
  ],
  [
    '_getFutures',
    {
      name: ALLOWED_COLLS.FUTURES,
      maxLimit: 5000,
      field: 'pairs',
      sort: [['pairs', 1]],
      hasNewData: true,
      type: 'public:updatable:array',
      model: { ..._models.get(TABLES_NAMES.FUTURES) }
    }
  ],
  [
    '_getCurrencies',
    {
      name: ALLOWED_COLLS.CURRENCIES,
      maxLimit: 5000,
      fields: ['id', 'name', 'pool', 'explorer'],
      sort: [['name', 1]],
      hasNewData: true,
      type: 'public:updatable:array:objects',
      fieldsOfUniqueIndex: ['id', 'name', 'pool', 'explorer'],
      model: { ..._models.get(TABLES_NAMES.CURRENCIES) }
    }
  ],
  [
    '_getCandles',
    {
      name: ALLOWED_COLLS.CANDLES,
      maxLimit: 5000,
      dateFieldName: 'mts',
      symbolFieldName: '_symbol',
      sort: [['mts', -1]],
      hasNewData: false,
      start: [],
      type: 'public:insertable:array:objects',
      fieldsOfUniqueIndex: ['_symbol', 'mts'],
      model: { ..._models.get(TABLES_NAMES.CANDLES) }
    }
  ]
])

const _cloneSchema = (map) => {
  return new Map(Array.from(map).map(item => cloneDeep(item)))
}

const getMethodCollMap = (methodCollMap = _methodCollMap) => {
  return _cloneSchema(methodCollMap)
}

const getModelsMap = (models = _models) => {
  return _cloneSchema(models)
}

module.exports = {
  SUPPORTED_DB_VERSION,
  getMethodCollMap,
  getModelsMap
}
