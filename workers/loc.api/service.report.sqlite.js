'use strict'

const MediatorReportService = require('./service.report.mediator')

const SqliteDAO = require('./sync/dao/dao.sqlite')

class SqliteReportService extends MediatorReportService {
  /**
   * @override
   */
  async _databaseInitialize () {
    const db = this.ctx.dbSqlite_m0.db
    const dao = new SqliteDAO(db)

    await super._databaseInitialize(dao)
  }
}

module.exports = SqliteReportService
