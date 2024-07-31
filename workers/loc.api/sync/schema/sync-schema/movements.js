'use strict'

const TABLES_NAMES = require('../tables-names')
const ALLOWED_COLLS = require('../allowed.colls')
const COLLS_TYPES = require('../colls.types')

const { getModelOf } = require('../models')

module.exports = {
  name: ALLOWED_COLLS.MOVEMENTS,
  maxLimit: 250,
  dateFieldName: 'mtsUpdated',
  symbolFieldName: 'currency',
  sort: [['mtsUpdated', -1]],
  hasNewData: false,
  start: [],
  isSyncRequiredAtLeastOnce: true,
  type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
  model: getModelOf(TABLES_NAMES.MOVEMENTS)
}
