'use strict'

const {
  ImplementationError,
  SqlCorrectnessError,
  DbVersionTypeError
} = require('../../../../errors')

const Migration = require('../migration')

class AbstractMigration extends Migration {
  async launch (version, isDown) {
    this.sqlArr = []
    const modelsMap = this.syncSchema.getModelsMap()
    const args = [modelsMap, this.TABLES_NAMES]

    await this.before(...args)

    if (isDown) {
      await this.beforeDown(...args)

      await this.down(...args)
      this.addSqlForSettingCurrDbVer(version)
      await this.dao.executeQueriesInTrans(this.sqlArr)

      await this.afterDown(...args)
      await this.after(...args)

      return
    }

    await this.beforeUp(...args)

    await this.up(...args)
    this.addSqlForSettingCurrDbVer(version)
    await this.dao.executeQueriesInTrans(this.sqlArr)

    await this.afterUp(...args)
    await this.after(...args)
  }

  addSqlForSettingCurrDbVer (version) {
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

  /**
   * @abstract
   */
  async before () {}
  /**
   * @abstract
   */
  async beforeUp () {}
  /**
   * @abstract
   */
  async beforeDown () {}

  /**
   * @abstract
   */
  async after () {}

  /**
   * @abstract
   */
  async afterUp () {}

  /**
   * @abstract
   */
  async afterDown () {}

  /**
   * @abstract
   */
  async up () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async down () { throw new ImplementationError() }
}

module.exports = AbstractMigration
