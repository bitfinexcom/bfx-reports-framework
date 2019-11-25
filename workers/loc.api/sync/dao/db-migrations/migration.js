'use strict'

const {
  ImplementationError
} = require('../../../errors')

class Migration {
  constructor (
    version,
    dao,
    TABLES_NAMES,
    syncSchema,
    logger
  ) {
    this.version = version
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.syncSchema = syncSchema
    this.logger = logger
  }

  getVersion () {
    return this.version
  }

  async launch (isDown) {
    this.logger.debug(`[Launch migration v${this.version}]`)

    const modelsMap = this.syncSchema.getModelsMap()
    const args = [modelsMap, this.TABLES_NAMES]

    await this.before(...args)

    if (isDown) {
      await this.beforeDown(...args)

      await this.down(...args)
      await this.execute(isDown)

      await this.afterDown(...args)
      await this.after(...args)

      this.logger.debug(
        `[Migration v${this.version} has been downed]`
      )

      return
    }

    await this.beforeUp(...args)

    await this.up(...args)
    await this.execute(isDown)

    await this.afterUp(...args)
    await this.after(...args)

    this.logger.debug(
      `[Migration v${this.version} has been upped]`
    )
  }

  /**
   * @abstract
   */
  async execute () { throw new ImplementationError() }

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

module.exports = Migration
