'use strict'

const {
  ImplementationError,
  SqlCorrectnessError
} = require('../../../../errors')

class AbstractMigration {
  constructor (
    dao,
    syncSchema
  ) {
    this.dao = dao
    this.syncSchema = syncSchema

    this.sqlArr = []
  }

  addSql (sql) {
    if (
      !sql ||
      typeof sql !== 'string'
    ) {
      throw new SqlCorrectnessError()
    }

    this.sqlArr.push(sql)
  }

  async launch (isDown) {
    this.sqlArr = []
    const modelsMap = this.syncSchema.getModelsMap()

    await this.before(modelsMap)

    if (isDown) {
      await this.beforeDown(modelsMap)

      await this.down(modelsMap)
      await this.dao.executeSql(this.sqlArr)

      await this.afterDown(modelsMap)
      await this.after(modelsMap)

      return
    }

    await this.beforeUp(modelsMap)

    await this.up(modelsMap)
    await this.dao.executeSql(this.sqlArr)

    await this.afterUp(modelsMap)
    await this.after(modelsMap)
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
