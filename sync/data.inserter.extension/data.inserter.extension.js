'use strict'

class DataInserterExtension {
  injectDeps (dataInserter) {
    this.dataInserter = dataInserter
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
