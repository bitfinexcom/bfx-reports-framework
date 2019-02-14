'use strict'

const BaseDataInserter = require('bfx-report/workers/loc.api/sync/data.inserter')

const ALLOWED_COLLS = require('../allowed.colls')

class DataInserter extends BaseDataInserter {
  constructor (
    reportService,
    syncColls = ALLOWED_COLLS.ALL,
    methodCollMap
  ) {
    super(
      reportService,
      syncColls,
      methodCollMap,
      ALLOWED_COLLS
    )
  }
}

module.exports = DataInserter
