'use strict'

const TABLES_NAMES = require('../tables-names')
const ALLOWED_COLLS = require('../allowed.colls')
const COLLS_TYPES = require('../colls.types')

const { getModelOf } = require('../models')

module.exports = {
  name: ALLOWED_COLLS.MAP_SYMBOLS,
  maxLimit: 10000,
  projection: ['key', 'value'],
  sort: [['key', 1]],
  hasNewData: false,
  isSyncRequiredAtLeastOnce: true,
  type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY_OBJECTS,
  model: getModelOf(TABLES_NAMES.MAP_SYMBOLS)
}
