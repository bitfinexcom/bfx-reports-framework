'use strict'

const {
  getMethodCollMap: _getMethodCollMap,
  getModelsMap: _getModelsMap
} = require('bfx-report/workers/loc.api/sync/schema')

const ALLOWED_COLLS = require('./allowed.colls')

const _addToModel = (name, schema = {}) => {
  return Object.entries(_getModelsMap().get(name))
    .reduce((accum, [key, val]) => {
      return {
        ...accum,
        [key]: val,
        ...(schema[key] && typeof schema[key] === 'object')
          ? schema[key]
          : {}
      }
    }, {})
}

const _models = new Map([
  [
    ALLOWED_COLLS.LEDGERS,
    _addToModel(
      ALLOWED_COLLS.LEDGERS,
      {
        amount: {
          amountUsd: 'DECIMAL(22,12)'
        },
        balance: {
          balanceUsd: 'DECIMAL(22,12)'
        }
      }
    )
  ],
  [
    ALLOWED_COLLS.MOVEMENTS,
    _addToModel(
      ALLOWED_COLLS.MOVEMENTS,
      {
        amount: {
          amountUsd: 'DECIMAL(22,12)'
        }
      }
    )
  ],
  [
    ALLOWED_COLLS.CANDLES,
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
  ]
])

const _methodCollMap = new Map([
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
      model: { ..._models.get(ALLOWED_COLLS.CANDLES) }
    }
  ],
  [
    '_getWallets',
    {
      ..._getMethodCollMap().get('_getWallets'),
      model: { ..._models.get(ALLOWED_COLLS.LEDGERS) },
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
  ]
])

const getMethodCollMap = () => {
  return new Map([
    ...[..._getMethodCollMap()].map(([key, schema]) => {
      return [
        key,
        {
          ...schema,
          model: getModelsMap().get(schema.name)
        }
      ]
    }),
    ..._getMethodCollMap(_methodCollMap)
  ])
}

const getModelsMap = () => {
  return new Map([
    ..._getModelsMap(),
    ..._getModelsMap(_models)
  ])
}

module.exports = {
  getMethodCollMap,
  getModelsMap
}
