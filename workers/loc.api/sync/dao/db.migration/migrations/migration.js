'use strict'

const {
  ImplementationError
} = require('../../../../errors')

class Migration {
  constructor (dao) {
    this.dao = dao
  }

  /**
   * @abstract
   */
  async launch () { throw new ImplementationError() }
}

module.exports = Migration
