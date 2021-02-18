'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')
const CHECKER_NAMES = require('./checker.names')

class Checkers {
  constructor (
    SYNC_API_METHODS,
    syncCollsManager
  ) {
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.syncCollsManager = syncCollsManager
  }

  // TODO:
  [CHECKER_NAMES.WALLETS] (auth) {}
}

decorate(injectable(), Checkers)
decorate(inject(TYPES.SYNC_API_METHODS), Checkers, 0)
decorate(inject(TYPES.SyncCollsManager), Checkers, 1)

module.exports = Checkers
