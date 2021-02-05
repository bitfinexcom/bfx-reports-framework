'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

class SyncCollsManager {
  constructor (
    dao,
    TABLES_NAMES
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
  }
}

decorate(injectable(), SyncCollsManager)
decorate(inject(TYPES.DAO), SyncCollsManager, 0)
decorate(inject(TYPES.TABLES_NAMES), SyncCollsManager, 1)

module.exports = SyncCollsManager
