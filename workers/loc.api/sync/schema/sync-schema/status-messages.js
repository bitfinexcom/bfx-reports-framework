'use strict'

const TABLES_NAMES = require('../tables-names')
const ALLOWED_COLLS = require('../allowed.colls')
const COLLS_TYPES = require('../colls.types')

const { getModelOf } = require('../models')

module.exports = {
  name: ALLOWED_COLLS.STATUS_MESSAGES,
  maxLimit: 5000,
  dateFieldName: 'timestamp',
  symbolFieldName: 'key',
  sort: [['timestamp', -1]],
  hasNewData: false,
  confName: 'statusMessagesConf',
  isSyncRequiredAtLeastOnce: false,
  type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY_OBJECTS,
  model: getModelOf(TABLES_NAMES.STATUS_MESSAGES)
}
