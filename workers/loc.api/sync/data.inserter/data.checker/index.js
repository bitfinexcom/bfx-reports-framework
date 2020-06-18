'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../../di/types')

class DataChecker {
  constructor (
    rService,
    dao,
    syncSchema,
    TABLES_NAMES,
    ALLOWED_COLLS
  ) {
    this.rService = rService
    this.dao = dao
    this.syncSchema = syncSchema
    this.TABLES_NAMES = TABLES_NAMES
    this.ALLOWED_COLLS = ALLOWED_COLLS
  }
}

decorate(injectable(), DataChecker)
decorate(inject(TYPES.RService), DataChecker, 0)
decorate(inject(TYPES.DAO), DataChecker, 1)
decorate(inject(TYPES.SyncSchema), DataChecker, 2)
decorate(inject(TYPES.TABLES_NAMES), DataChecker, 3)
decorate(inject(TYPES.ALLOWED_COLLS), DataChecker, 4)

module.exports = DataChecker
