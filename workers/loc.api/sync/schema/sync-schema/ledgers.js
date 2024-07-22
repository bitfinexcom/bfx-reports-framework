'use strict'

const TABLES_NAMES = require('../tables-names')
const ALLOWED_COLLS = require('../allowed.colls')
const COLLS_TYPES = require('../colls.types')

const { getModelOf } = require('../models')

module.exports = {
  name: ALLOWED_COLLS.LEDGERS,
  maxLimit: 2500,
  dateFieldName: 'mts',
  symbolFieldName: 'currency',
  sort: [['mts', -1], ['id', -1]],
  hasNewData: false,
  start: [],
  isSyncRequiredAtLeastOnce: true,
  type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
  model: getModelOf(TABLES_NAMES.LEDGERS)
}
