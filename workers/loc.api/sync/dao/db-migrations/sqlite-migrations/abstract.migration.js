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

  // TODO:
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

    const sql = `INSERT INTO ${this.TABLES_NAMES.DB_CONFIGS}(version) VALUES ($version)`
    const values = { $version: version }

    this.addSql({ sql, values })
  }

  addSql (sql) {
    const sqlArr = Array.isArray(sql)
      ? sql
      : [sql]

    const data = sqlArr.map((sqlData) => {
      const sqlObj = typeof sqlData === 'string'
        ? { sql: sqlData, values: null }
        : sqlData
      const { sql, values } = { ...sqlObj }

      if (
        !sql ||
        typeof sql !== 'string'
      ) {
        throw new SqlCorrectnessError()
      }

      return { sql, values }
    })

    this.sqlArr = Array.isArray(this.sqlArr)
      ? this.sqlArr
      : []
    this.sqlArr.push(...data)
  }
}

module.exports = AbstractMigration
