'use strict'

const TABLES_NAMES = require('../tables-names')
const ALLOWED_COLLS = require('../allowed.colls')
const COLLS_TYPES = require('../colls.types')
const PUBLIC_COLLS_CONF_NAMES = require(
  '../../colls.accessors/public.colls.conf.names'
)

const { getModelOf } = require('../models')

module.exports = {
  name: ALLOWED_COLLS.STATUS_MESSAGES,
  maxLimit: 5000,
  dateFieldName: 'timestamp',
  symbolFieldName: 'key',
  sort: [['timestamp', -1]],
  hasNewData: false,
  confName: PUBLIC_COLLS_CONF_NAMES.STATUS_MESSAGES_CONF,
  isSyncRequiredAtLeastOnce: false,
  type: COLLS_TYPES.PUBLIC_UPDATABLE_ARRAY_OBJECTS,
  model: getModelOf(TABLES_NAMES.STATUS_MESSAGES)
}
