'use strict'

const TABLES_NAMES = require('../tables-names')
const ALLOWED_COLLS = require('../allowed.colls')
const COLLS_TYPES = require('../colls.types')

const { getModelOf } = require('../models')

module.exports = {
  name: ALLOWED_COLLS.ORDERS,
  maxLimit: 2500,
  dateFieldName: 'mtsUpdate',
  symbolFieldName: 'symbol',
  sort: [['mtsUpdate', -1]],
  hasNewData: false,
  start: [],
  isSyncRequiredAtLeastOnce: false,
  type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
  model: getModelOf(TABLES_NAMES.ORDERS)
}
