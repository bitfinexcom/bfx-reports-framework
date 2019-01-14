'use strict'

const { cloneDeep } = require('lodash')

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
      _symbol: 'VARCHAR(255)',
      _section: 'VARCHAR(255)'
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
      start: 0,
      type: 'insertable:array:objects',
      fieldsOfUniqueIndex: ['id', 'mts'],
      model: { ..._models.get(ALLOWED_COLLS.CANDLES) }
    }
  ]
])

const _cloneSchema = (map) => {
  return new Map(Array.from(map).map(item => cloneDeep(item)))
}

const getMethodCollMap = () => {
  return _cloneSchema(_methodCollMap)
}

const getModelsMap = () => {
  return _cloneSchema(_models)
}

module.exports = {
  getMethodCollMap,
  getModelsMap
}
