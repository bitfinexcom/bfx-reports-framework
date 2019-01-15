'use strict'

class CandlesExtension {
  /**
   * TODO:
   * @override
   */
  async checkNewData (
    method,
    schema
  ) {
    schema.hasNewData = false

    const args = this.dataInserter._getMethodArgMap(method, null, 1)
  }

  /**
   * TODO:
   * @override
   */
  async insertNewData (
    method,
    schema
  ) {
    const args = this.dataInserter._getMethodArgMap(
      method,
      null,
      10000000,
      schema.start
    )
  }
}

module.exports = CandlesExtension
