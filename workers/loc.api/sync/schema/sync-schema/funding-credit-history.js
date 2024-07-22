'use strict'

const TABLES_NAMES = require('../tables-names')
const ALLOWED_COLLS = require('../allowed.colls')
const COLLS_TYPES = require('../colls.types')

const { getModelOf } = require('../models')

module.exports = {
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
