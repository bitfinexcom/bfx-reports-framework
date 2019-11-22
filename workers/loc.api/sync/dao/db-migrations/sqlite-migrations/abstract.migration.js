'use strict'

const {
  SqlCorrectnessError,
  DbVersionTypeError
} = require('../../../../errors')

const Migration = require('../migration')

class AbstractMigration extends Migration {
  /**
   * @override
   */
  async launch (isDown) {
    this.sqlArr = []

    await super.launch(isDown)
  }

  /**
   * @override
   */
  async execute () {
    this.addSqlForSettingCurrDbVer()

    await this.dao.executeQueriesInTrans(this.sqlArr)
  }

  addSqlForSettingCurrDbVer () {
    const version = this.getVersion()

    if (
      !version ||
      !Array.isArray(this.sqlArr) ||
      this.sqlArr.length === 0
    ) {
      return
    }
    if (!Number.isInteger(version)) {
      throw new DbVersionTypeError()
    }

    this.addSql(`PRAGMA user_version = ${version}`)
  }

  addSql (sql) {
    const sqlArr = Array.isArray(sql)
      ? sql
      : [sql]

    const data = sqlArr.map((sqlData) => {
      const _sqlObj = typeof sqlData === 'string'
        ? { sql: sqlData }
        : sqlData
      const sqlObj = typeof _sqlObj === 'function'
        ? { execQueryFn: _sqlObj }
        : _sqlObj
      const { sql, values, execQueryFn } = { ...sqlObj }

      if (
        (!sql || typeof sql !== 'string') &&
        typeof execQueryFn !== 'function'
      ) {
        throw new SqlCorrectnessError()
      }

      return { sql, values, execQueryFn }
    })

    this.sqlArr = Array.isArray(this.sqlArr)
      ? this.sqlArr
      : []
    this.sqlArr.push(...data)
  }
}

module.exports = AbstractMigration
