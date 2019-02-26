'use strict'

const BaseSqliteDAO = require('bfx-report/workers/loc.api/sync/dao/dao.sqlite')

const {
  getMethodCollMap,
  getModelsMap
} = require('./../schema')

class SqliteDAO extends BaseSqliteDAO {
  /**
   * @override
   */
  _getModelsMap () {
    return getModelsMap()
  }

  /**
   * @override
   */
  _getMethodCollMap () {
    return getMethodCollMap()
  }
}

module.exports = SqliteDAO
