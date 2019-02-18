'use strict'

const {
  getMethodCollMap: _getMethodCollMap,
  getModelsMap: _getModelsMap
} = require('bfx-report/workers/loc.api/sync/schema')

const ALLOWED_COLLS = require('./allowed.colls')

const _models = new Map([
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
  ]
])

const getMethodCollMap = () => {
  return new Map([
    ..._getMethodCollMap(),
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
