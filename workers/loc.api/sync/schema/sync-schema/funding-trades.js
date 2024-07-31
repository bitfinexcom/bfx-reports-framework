'use strict'

const TABLES_NAMES = require('../tables-names')
const ALLOWED_COLLS = require('../allowed.colls')
const COLLS_TYPES = require('../colls.types')

const { getModelOf } = require('../models')

module.exports = {
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
