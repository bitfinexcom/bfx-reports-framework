'use strict'

const WrkReportServiceApi = require('bfx-report/workers/api.service.report.wrk')

const DataInserter = require('./loc.api/sync/data.inserter')
const ALLOWED_COLLS = require('./loc.api/sync/allowed.colls')

class WrkReportFrameWorkApi extends WrkReportServiceApi {
  /**
   * @override
   */
  _dataInserterFactory (isSingleton, ...args) {
    return this._depsFactory(
      DataInserter,
      args,
      isSingleton && 'dataInserter'
    )
  }

  /**
   * @override
   */
  _syncQueueFactory (isSingleton, ...args) {
    const _args = args.length > 0
      ? args
      : ['syncQueue', ALLOWED_COLLS]

    return super._syncQueueFactory(
      isSingleton,
      ..._args
    )
  }
}

module.exports = WrkReportFrameWorkApi
