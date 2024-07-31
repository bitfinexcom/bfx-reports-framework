'use strict'

const TABLES_NAMES = require('../tables-names')
const ALLOWED_COLLS = require('../allowed.colls')
const COLLS_TYPES = require('../colls.types')

const { getModelOf } = require('../models')

module.exports = {
  name: ALLOWED_COLLS.MARGIN_CURRENCY_LIST,
  maxLimit: 10000,
  projection: 'symbol',
  sort: [['symbol', 1]],
  hasNewData: false,
  isSyncRequiredAtLeastOnce: true,
  type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY,
  model: getModelOf(TABLES_NAMES.MARGIN_CURRENCY_LIST)
}