'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

class DataConsistencyChecker {
  constructor (
    SYNC_API_METHODS,
    syncCollsManager
  ) {
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.syncCollsManager = syncCollsManager
  }

  // TODO:
  async check (checkerName, args) {}
}

decorate(injectable(), DataConsistencyChecker)
decorate(inject(TYPES.SYNC_API_METHODS), DataConsistencyChecker, 0)
decorate(inject(TYPES.SyncCollsManager), DataConsistencyChecker, 1)

module.exports = DataConsistencyChecker
