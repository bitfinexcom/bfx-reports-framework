'use strict'

/*
 * The version must be increased when DB schema is changed
 *
 * For each new DB version need to implement new migration
 * in the `workers/loc.api/sync/dao/db-migrations/sqlite-migrations` folder,
 * e.g. `migration.v1.js`, where `v1` is `SUPPORTED_DB_VERSION`
 */
const SUPPORTED_DB_VERSION = 14

const TABLES_NAMES = require('./tables-names')
const ALLOWED_COLLS = require('./allowed.colls')
const SYNC_API_METHODS = require('./sync.api.methods')
const {
  CONSTR_FIELD_NAME,
  TRIGGER_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('./const')
const COLLS_TYPES = require('./colls.types')
const {
  cloneSchema,
  getModelsMap: _getModelsMap,
  getModelOf
} = require('./helpers')

const getMethodCollMap = (methodCollMap = _methodCollMap) => {
  return cloneSchema(methodCollMap)
}

const getModelsMap = (params = {}) => {
  return _getModelsMap({ models: _models, ...params })
}

const _getModelOf = (tableName) => {
  return getModelOf(tableName, _models)
}

const _models = new Map([
  [
    TABLES_NAMES.USERS,
    {
      _id: ID_PRIMARY_KEY,
      id: 'BIGINT',
      email: 'VARCHAR(255)',
      apiKey: 'VARCHAR(255) NOT NULL',
      apiSecret: 'VARCHAR(255) NOT NULL',
      active: 'INT',
      isDataFromDb: 'INT',
      timezone: 'VARCHAR(255)',
      username: 'VARCHAR(255)',
      passwordHash: 'VARCHAR(255)',
      isNotProtected: 'INT',
      isSubAccount: 'INT',
      isSubUser: 'INT'
    }
  ],
  [
    TABLES_NAMES.SUB_ACCOUNTS,
    {
      _id: ID_PRIMARY_KEY,
      masterUserId: 'INT NOT NULL',
      subUserId: 'INT NOT NULL',
      [CONSTR_FIELD_NAME]: [
        `CONSTRAINT #{tableName}_fk_masterUserId
        FOREIGN KEY (masterUserId)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
        `CONSTRAINT #{tableName}_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
      ],
      [TRIGGER_FIELD_NAME]: `delete_#{tableName}_subUsers_from_${TABLES_NAMES.USERS}
        AFTER DELETE ON #{tableName}
        FOR EACH ROW
        BEGIN
          DELETE FROM ${TABLES_NAMES.USERS}
            WHERE _id = OLD.subUserId;
        END`
    }
  ],
  [
    TABLES_NAMES.LEDGERS,
    {
      _id: ID_PRIMARY_KEY,
      id: 'BIGINT',
      currency: 'VARCHAR(255)',
      mts: 'BIGINT',
      amount: 'DECIMAL(22,12)',
      amountUsd: 'DECIMAL(22,12)',
      balance: 'DECIMAL(22,12)',
      _nativeBalance: 'DECIMAL(22,12)',
      balanceUsd: 'DECIMAL(22,12)',
      _nativeBalanceUsd: 'DECIMAL(22,12)',
      description: 'TEXT',
      wallet: 'VARCHAR(255)',
      _category: 'INT',
      _isMarginFundingPayment: 'INT',
      _isAffiliateRebate: 'INT',
      _isStakingPayments: 'INT',
      _isBalanceRecalced: 'INT',
      subUserId: 'INT',
      user_id: 'INT NOT NULL',
      [CONSTR_FIELD_NAME]: `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.TRADES,
    {
      _id: ID_PRIMARY_KEY,
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
      subUserId: 'INT',
      user_id: 'INT NOT NULL',
      [CONSTR_FIELD_NAME]: `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.FUNDING_TRADES,
    {
      _id: ID_PRIMARY_KEY,
      id: 'BIGINT',
      symbol: 'VARCHAR(255)',
      mtsCreate: 'BIGINT',
      offerID: 'BIGINT',
      amount: 'DECIMAL(22,12)',
      rate: 'DECIMAL(22,12)',
      period: 'BIGINT',
      maker: 'INT',
      subUserId: 'INT',
      user_id: 'INT NOT NULL',
      [CONSTR_FIELD_NAME]: `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.PUBLIC_TRADES,
    {
      _id: ID_PRIMARY_KEY,
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
      _id: ID_PRIMARY_KEY,
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
      subUserId: 'INT',
      user_id: 'INT NOT NULL',
      [CONSTR_FIELD_NAME]: `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.MOVEMENTS,
    {
      _id: ID_PRIMARY_KEY,
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
      subUserId: 'INT',
      user_id: 'INT NOT NULL',
      [CONSTR_FIELD_NAME]: `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.FUNDING_OFFER_HISTORY,
    {
      _id: ID_PRIMARY_KEY,
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
      subUserId: 'INT',
      user_id: 'INT NOT NULL',
      [CONSTR_FIELD_NAME]: `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.FUNDING_LOAN_HISTORY,
    {
      _id: ID_PRIMARY_KEY,
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
      subUserId: 'INT',
      user_id: 'INT NOT NULL',
      [CONSTR_FIELD_NAME]: `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.FUNDING_CREDIT_HISTORY,
    {
      _id: ID_PRIMARY_KEY,
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
      subUserId: 'INT',
      user_id: 'INT NOT NULL',
      [CONSTR_FIELD_NAME]: `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.POSITIONS_HISTORY,
    {
      _id: ID_PRIMARY_KEY,
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
      subUserId: 'INT',
      user_id: 'INT NOT NULL',
      [CONSTR_FIELD_NAME]: `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.LOGINS,
    {
      _id: ID_PRIMARY_KEY,
      id: 'BIGINT',
      time: 'BIGINT',
      ip: 'VARCHAR(255)',
      extraData: 'TEXT',
      subUserId: 'INT',
      user_id: 'INT NOT NULL',
      [CONSTR_FIELD_NAME]: `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
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
      [CONSTR_FIELD_NAME]: `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
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
      mtsUpdate: 'BIGINT'
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
      _type: 'VARCHAR(255)'
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
      user_id: 'INT NOT NULL',
      [CONSTR_FIELD_NAME]: `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ],
  [
    TABLES_NAMES.SYMBOLS,
    {
      _id: ID_PRIMARY_KEY,
      pairs: 'VARCHAR(255)'
    }
  ],
  [
    TABLES_NAMES.INACTIVE_SYMBOLS,
    {
      _id: ID_PRIMARY_KEY,
      pairs: 'VARCHAR(255)'
    }
  ],
  [
    TABLES_NAMES.FUTURES,
    {
      _id: ID_PRIMARY_KEY,
      pairs: 'VARCHAR(255)'
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
      walletFx: 'TEXT'
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
      _timeframe: 'VARCHAR(255)'
    }
  ],
  [
    TABLES_NAMES.SCHEDULER,
    {
      _id: ID_PRIMARY_KEY,
      isEnable: 'INT'
    }
  ],
  [
    TABLES_NAMES.SYNC_MODE,
    {
      _id: ID_PRIMARY_KEY,
      isEnable: 'INT'
    }
  ],
  [
    TABLES_NAMES.PROGRESS,
    {
      _id: ID_PRIMARY_KEY,
      value: 'VARCHAR(255)'
    }
  ],
  [
    TABLES_NAMES.SYNC_QUEUE,
    {
      _id: ID_PRIMARY_KEY,
      collName: 'VARCHAR(255)',
      state: 'VARCHAR(255)'
    }
  ],
  [
    TABLES_NAMES.COMPLETED_ON_FIRST_SYNC_COLLS,
    {
      _id: ID_PRIMARY_KEY,
      collName: 'VARCHAR(255)',
      user_id: 'INT NOT NULL',
      [CONSTR_FIELD_NAME]: `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
    }
  ]
])

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
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      fieldsOfIndex: ['mts', 'currency'],
      fieldsOfUniqueIndex: ['id', 'user_id'],
      model: _getModelOf(TABLES_NAMES.LEDGERS)
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
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      fieldsOfIndex: ['mtsCreate', 'symbol'],
      fieldsOfUniqueIndex: ['id', 'symbol', 'user_id'],
      model: _getModelOf(TABLES_NAMES.TRADES)
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
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      fieldsOfIndex: ['mtsCreate', 'symbol'],
      fieldsOfUniqueIndex: ['id', 'user_id'],
      model: _getModelOf(TABLES_NAMES.FUNDING_TRADES)
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
      type: COLLS_TYPES.PUBLIC_INSERTABLE_ARRAY_OBJECTS,
      fieldsOfIndex: ['mts', '_symbol'],
      fieldsOfUniqueIndex: ['id', '_symbol'],
      model: _getModelOf(TABLES_NAMES.PUBLIC_TRADES)
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
      type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY_OBJECTS,
      fieldsOfIndex: ['timestamp', 'key'],
      fieldsOfUniqueIndex: ['timestamp', 'key', '_type'],
      model: _getModelOf(TABLES_NAMES.STATUS_MESSAGES)
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
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      fieldsOfIndex: ['mtsUpdate', 'symbol'],
      fieldsOfUniqueIndex: ['id', 'user_id'],
      model: _getModelOf(TABLES_NAMES.ORDERS)
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
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      fieldsOfIndex: ['mtsUpdated', 'currency'],
      fieldsOfUniqueIndex: ['id', 'user_id'],
      model: _getModelOf(TABLES_NAMES.MOVEMENTS)
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
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      fieldsOfIndex: ['mtsUpdate', 'symbol'],
      fieldsOfUniqueIndex: ['id', 'user_id'],
      model: _getModelOf(TABLES_NAMES.FUNDING_OFFER_HISTORY)
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
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      fieldsOfIndex: ['mtsUpdate', 'symbol'],
      fieldsOfUniqueIndex: ['id', 'user_id'],
      model: _getModelOf(TABLES_NAMES.FUNDING_LOAN_HISTORY)
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
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      fieldsOfIndex: ['mtsUpdate', 'symbol'],
      fieldsOfUniqueIndex: ['id', 'user_id'],
      model: _getModelOf(TABLES_NAMES.FUNDING_CREDIT_HISTORY)
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
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      fieldsOfIndex: ['mtsUpdate', 'symbol'],
      fieldsOfUniqueIndex: ['id', 'user_id'],
      model: _getModelOf(TABLES_NAMES.POSITIONS_HISTORY)
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
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      fieldsOfIndex: ['time'],
      fieldsOfUniqueIndex: ['id', 'user_id'],
      model: _getModelOf(TABLES_NAMES.LOGINS)
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
      type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
      fieldsOfIndex: ['mtsCreate'],
      fieldsOfUniqueIndex: ['mtsCreate', 'log', 'user_id'],
      model: _getModelOf(TABLES_NAMES.CHANGE_LOGS)
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
      type: COLLS_TYPES.PUBLIC_INSERTABLE_ARRAY_OBJECTS,
      fieldsOfIndex: null,
      fieldsOfUniqueIndex: ['mtsUpdate', 'symbol'],
      model: _getModelOf(TABLES_NAMES.TICKERS_HISTORY)
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
      type: COLLS_TYPES.HIDDEN_INSERTABLE_ARRAY_OBJECTS,
      model: _getModelOf(TABLES_NAMES.LEDGERS),
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
      type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY,
      model: _getModelOf(TABLES_NAMES.SYMBOLS)
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
      type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY,
      model: _getModelOf(TABLES_NAMES.INACTIVE_SYMBOLS)
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
      type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY,
      model: _getModelOf(TABLES_NAMES.FUTURES)
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
      type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY_OBJECTS,
      fieldsOfUniqueIndex: ['id'],
      model: _getModelOf(TABLES_NAMES.CURRENCIES)
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
      type: COLLS_TYPES.PUBLIC_INSERTABLE_ARRAY_OBJECTS,
      fieldsOfIndex: ['mts', '_symbol'],
      fieldsOfUniqueIndex: ['_symbol', '_timeframe', 'mts'],
      model: _getModelOf(TABLES_NAMES.CANDLES)
    }
  ]
])

module.exports = {
  SUPPORTED_DB_VERSION,
  getMethodCollMap,
  getModelsMap
}