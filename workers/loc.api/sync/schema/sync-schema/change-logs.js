'use strict'

const TABLES_NAMES = require('../tables-names')
const ALLOWED_COLLS = require('../allowed.colls')
const COLLS_TYPES = require('../colls.types')

const { getModelOf } = require('../models')

module.exports = {
  name: ALLOWED_COLLS.CHANGE_LOGS,
  maxLimit: 10000,
  dateFieldName: 'mtsCreate',
  symbolFieldName: null,
  sort: [['mtsCreate', -1]],
  hasNewData: false,
  start: [],
  isSyncRequiredAtLeastOnce: false,
  type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
  model: getModelOf(TABLES_NAMES.CHANGE_LOGS)
}
