'use strict'

const TABLES_NAMES = require('../tables-names')
const ALLOWED_COLLS = require('../allowed.colls')
const COLLS_TYPES = require('../colls.types')

const { getModelOf } = require('../models')

module.exports = {
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
