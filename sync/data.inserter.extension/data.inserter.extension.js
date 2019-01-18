'use strict'

class DataInserterExtension {
  injectDeps (dataInserter, ALLOWED_COLLS) {
    this.dataInserter = dataInserter
    this.dao = dataInserter.dao
    this.ALLOWED_COLLS = ALLOWED_COLLS
  }

  /**
   * @abstract
   */
  async checkNewData () { throw new Error('NOT_IMPLEMENTED') }

  /**
   * @abstract
   */
  async insertNewData () { throw new Error('NOT_IMPLEMENTED') }
}

module.exports = DataInserterExtension
