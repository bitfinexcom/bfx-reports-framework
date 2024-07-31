'use strict'

const TABLES_NAMES = require('../tables-names')
const ALLOWED_COLLS = require('../allowed.colls')
const COLLS_TYPES = require('../colls.types')

const { getModelOf } = require('../models')

module.exports = {
  name: ALLOWED_COLLS.PAY_INVOICE_LIST,
  maxLimit: 100,
  dateFieldName: 't',
  symbolFieldName: 'currency',
  sort: [['t', -1]],
  hasNewData: false,
  start: [],
  isSyncRequiredAtLeastOnce: false,
  type: COLLS_TYPES.INSERTABLE_ARRAY_OBJECTS,
  model: getModelOf(TABLES_NAMES.PAY_INVOICE_LIST)
}
