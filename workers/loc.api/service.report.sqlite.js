'use strict'

const MediatorReportService = require('./service.report.mediator')

class SqliteReportService extends MediatorReportService {
  /**
   * @override
   */
  async _databaseInitialize (db) {
    const _db = db || this.ctx.dbSqlite_m0.db

    await super._databaseInitialize(_db)
  }
}

module.exports = SqliteReportService
