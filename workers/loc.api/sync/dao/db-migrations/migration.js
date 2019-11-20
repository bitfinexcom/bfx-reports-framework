'use strict'

const {
  ImplementationError
} = require('../../../errors')

class Migration {
  constructor (
    dao,
    TABLES_NAMES,
    syncSchema
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.syncSchema = syncSchema
  }

  /**
   * @abstract
   */
  async launch () { throw new ImplementationError() }
}

module.exports = Migration
