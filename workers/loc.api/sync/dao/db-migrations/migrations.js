'use strict'

const {
  ImplementationError
} = require('../../../errors')

class Migrations {
  constructor (
    dao,
    syncSchema
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
  }

  /**
   * @abstract
   */
  async launch () { throw new ImplementationError() }
}

module.exports = Migrations
