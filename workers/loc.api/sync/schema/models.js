'use strict'

/*
 * The version must be increased when DB schema is changed
 *
 * For each new DB version need to implement new migration
 * in the `workers/loc.api/sync/dao/db-migrations/sqlite-migrations` folder,
 * e.g. `migration.v1.js`, where `v1` is `SUPPORTED_DB_VERSION`
 */

const SUPPORTED_DB_VERSION = 23

const TABLES_NAMES = require('./tables-names')
const {
  CONSTR_FIELD_NAME,
  TRIGGER_FIELD_NAME,
  INDEX_FIELD_NAME,
  UNIQUE_INDEX_FIELD_NAME,
  ID_PRIMARY_KEY
} = require('./const')
const {
  getModelsMap: _getModelsMap,
  getModelOf: _getModelOf
} = require('./helpers')

const getModelsMap = (params = {}) => {
  return _getModelsMap({ models: _models, ...params })
}

const getModelOf = (tableName) => {
  return _getModelOf(tableName, _models)
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
      isSubUser: 'INT',

      [UNIQUE_INDEX_FIELD_NAME]: ['email', 'username']
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

      [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
      [INDEX_FIELD_NAME]: [
        ['user_id', 'wallet', 'currency', 'mts'],
        ['user_id', 'wallet', 'mts'],
        ['user_id', 'currency', 'mts'],
        ['user_id', '_isMarginFundingPayment', 'mts'],
        ['user_id', '_isAffiliateRebate', 'mts'],
        ['user_id', '_isStakingPayments', 'mts'],
        ['user_id', '_category', 'mts'],
        ['user_id', 'mts'],
        ['currency', 'mts'],
        ['user_id', 'subUserId', 'mts',
          'WHERE subUserId IS NOT NULL'],
        ['subUserId', 'mts', '_id',
          'WHERE subUserId IS NOT NULL']
      ],
      [CONSTR_FIELD_NAME]: [
        `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
        `CONSTRAINT #{tableName}_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
      ]
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

      [UNIQUE_INDEX_FIELD_NAME]: ['id', 'symbol', 'user_id'],
      [INDEX_FIELD_NAME]: [
        ['user_id', 'symbol', 'mtsCreate'],
        ['user_id', 'orderID', 'mtsCreate'],
        ['user_id', 'mtsCreate'],
        ['user_id', 'subUserId', 'mtsCreate',
          'WHERE subUserId IS NOT NULL'],
        ['subUserId', 'orderID',
          'WHERE subUserId IS NOT NULL']
      ],
      [CONSTR_FIELD_NAME]: [
        `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
        `CONSTRAINT #{tableName}_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
      ]
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

      [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
      [INDEX_FIELD_NAME]: [
        ['user_id', 'symbol', 'mtsCreate'],
        ['user_id', 'mtsCreate'],
        ['user_id', 'subUserId', 'mtsCreate',
          'WHERE subUserId IS NOT NULL']
      ],
      [CONSTR_FIELD_NAME]: [
        `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
        `CONSTRAINT #{tableName}_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
      ]
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
      _symbol: 'VARCHAR(255)',

      [UNIQUE_INDEX_FIELD_NAME]: ['id', '_symbol'],
      [INDEX_FIELD_NAME]: [
        ['_symbol', 'mts'],
        ['mts']
      ]
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

      [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
      [INDEX_FIELD_NAME]: [
        ['user_id', 'symbol', 'mtsUpdate'],
        ['user_id', 'type', 'mtsUpdate'],
        ['user_id', 'mtsUpdate'],
        ['user_id', 'subUserId', 'mtsUpdate',
          'WHERE subUserId IS NOT NULL']
      ],
      [CONSTR_FIELD_NAME]: [
        `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
        `CONSTRAINT #{tableName}_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
      ]
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
      note: 'TEXT',
      subUserId: 'INT',
      user_id: 'INT NOT NULL',

      [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
      [INDEX_FIELD_NAME]: [
        ['user_id', 'status', 'mtsStarted'],
        ['user_id', 'status', 'mtsUpdated'],
        ['user_id', 'currency', 'mtsUpdated'],
        ['user_id', 'mtsUpdated'],
        ['user_id', 'subUserId', 'mtsUpdated',
          'WHERE subUserId IS NOT NULL']
      ],
      [CONSTR_FIELD_NAME]: [
        `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
        `CONSTRAINT #{tableName}_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
      ]
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

      [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
      [INDEX_FIELD_NAME]: [
        ['user_id', 'symbol', 'mtsUpdate'],
        ['user_id', 'status', 'mtsUpdate'],
        ['user_id', 'mtsUpdate'],
        ['user_id', 'subUserId', 'mtsUpdate',
          'WHERE subUserId IS NOT NULL']
      ],
      [CONSTR_FIELD_NAME]: [
        `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
        `CONSTRAINT #{tableName}_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
      ]
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

      [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
      [INDEX_FIELD_NAME]: [
        ['user_id', 'symbol', 'mtsUpdate'],
        ['user_id', 'status', 'mtsUpdate'],
        ['user_id', 'mtsUpdate'],
        ['user_id', 'subUserId', 'mtsUpdate',
          'WHERE subUserId IS NOT NULL']
      ],
      [CONSTR_FIELD_NAME]: [
        `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
        `CONSTRAINT #{tableName}_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
      ]
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

      [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
      [INDEX_FIELD_NAME]: [
        ['user_id', 'symbol', 'mtsUpdate'],
        ['user_id', 'status', 'mtsUpdate'],
        ['user_id', 'mtsUpdate'],
        ['user_id', 'subUserId', 'mtsUpdate',
          'WHERE subUserId IS NOT NULL']
      ],
      [CONSTR_FIELD_NAME]: [
        `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
        `CONSTRAINT #{tableName}_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
      ]
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

      [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
      [INDEX_FIELD_NAME]: [
        ['user_id', 'symbol', 'mtsUpdate'],
        ['user_id', 'mtsUpdate', 'mtsCreate'],
        ['user_id', 'mtsUpdate'],
        ['user_id', 'subUserId', 'mtsUpdate',
          'WHERE subUserId IS NOT NULL'],
        ['subUserId', 'id',
          'WHERE subUserId IS NOT NULL']
      ],
      [CONSTR_FIELD_NAME]: [
        `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
        `CONSTRAINT #{tableName}_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
      ]
    }
  ],
  [
    TABLES_NAMES.POSITIONS_SNAPSHOT,
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

      // The API returns a lot of data with the same values,
      // that cause unique indexes are not included
      [INDEX_FIELD_NAME]: [
        ['user_id', 'mtsUpdate'],
        ['user_id', 'symbol', 'mtsUpdate'],
        ['user_id', 'subUserId', 'mtsUpdate',
          'WHERE subUserId IS NOT NULL']
      ],
      [CONSTR_FIELD_NAME]: [
        `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
        `CONSTRAINT #{tableName}_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
      ]
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

      [UNIQUE_INDEX_FIELD_NAME]: ['id', 'user_id'],
      [INDEX_FIELD_NAME]: [
        ['user_id', 'time'],
        ['user_id', 'subUserId', 'time',
          'WHERE subUserId IS NOT NULL']
      ],
      [CONSTR_FIELD_NAME]: [
        `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
        `CONSTRAINT #{tableName}_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
      ]
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

      [UNIQUE_INDEX_FIELD_NAME]: ['mtsCreate', 'log', 'user_id'],
      [INDEX_FIELD_NAME]: [
        ['user_id', 'mtsCreate'],
        ['user_id', 'subUserId', 'mtsCreate',
          'WHERE subUserId IS NOT NULL']
      ],
      [CONSTR_FIELD_NAME]: [
        `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
        `CONSTRAINT #{tableName}_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
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

      [UNIQUE_INDEX_FIELD_NAME]: ['timestamp', 'key', '_type'],
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
      user_id: 'INT NOT NULL',

      [UNIQUE_INDEX_FIELD_NAME]: [
        'symbol', 'user_id', 'confName', 'timeframe'
      ],
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
    TABLES_NAMES.MAP_SYMBOLS,
    {
      _id: ID_PRIMARY_KEY,
      key: 'VARCHAR(255)',
      value: 'VARCHAR(255)',

      [UNIQUE_INDEX_FIELD_NAME]: ['key', 'value']
    }
  ],
  [
    TABLES_NAMES.INACTIVE_CURRENCIES,
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
      walletFx: 'TEXT',

      [UNIQUE_INDEX_FIELD_NAME]: ['id']
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
      collName: 'VARCHAR(255) NOT NULL',
      mts: 'BIGINT',
      subUserId: 'INT',
      user_id: 'INT',

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
        `CONSTRAINT #{tableName}_fk_user_id
        FOREIGN KEY (user_id)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`,
        `CONSTRAINT #{tableName}_fk_subUserId
        FOREIGN KEY (subUserId)
        REFERENCES ${TABLES_NAMES.USERS}(_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE`
      ]
    }
  ]
])

module.exports = {
  SUPPORTED_DB_VERSION,
  getModelsMap,
  getModelOf
}
