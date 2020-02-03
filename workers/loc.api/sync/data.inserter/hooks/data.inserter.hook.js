'use strict'

const {
  decorate,
  injectable
} = require('inversify')

const {
  ImplementationError
} = require('../../../errors')

class DataInserterHook {
  constructor () {
    this._dataInserter = null
    this._opts = {}
    this._isInit = false
  }

  setDataInserter (dataInserter) {
    this._dataInserter = dataInserter
  }

  getDataInserter () {
    return this._dataInserter
  }

  init (opts = {}) {
    if (this._isInit) {
      return false
    }

    this._opts = {
      ...this._opts,
      ...opts
    }
    this._isInit = true

    return true
  }

  /**
   * @abstract
   */
  async execute () { throw new ImplementationError() }
}

decorate(injectable(), DataInserterHook)

module.exports = DataInserterHook
