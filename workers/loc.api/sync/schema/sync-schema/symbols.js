'use strict'

const TABLES_NAMES = require('../tables-names')
const ALLOWED_COLLS = require('../allowed.colls')
const COLLS_TYPES = require('../colls.types')

const { getModelOf } = require('../models')

module.exports = {
  name: ALLOWED_COLLS.SYMBOLS,
  maxLimit: 10000,
  projection: 'pairs',
  sort: [['pairs', 1]],
  hasNewData: false,
  isSyncRequiredAtLeastOnce: true,
  type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY,
  model: getModelOf(TABLES_NAMES.SYMBOLS)
}
