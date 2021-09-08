'use strict'

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.SyncSchema,
  TYPES.ALLOWED_COLLS,
  TYPES.Authenticator
]
class Movements {
  constructor (
    dao,
    syncSchema,
    ALLOWED_COLLS,
    authenticator
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.authenticator = authenticator

    this.movementsModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.MOVEMENTS)
  }

  getMovements (params = {}) {
    const {
      filter,
      sort,
      projection = this.movementsModel,
      exclude = ['user_id'],
      isExcludePrivate = true
    } = params
  }

  /*
   * Consider the `SA(nameAccount1->nameAccount2)` transfers
   * as internal movements for win/loss and tax calculations
   */
  _getLedgers (params = {}) {}
}

decorateInjectable(Movements, depsTypes)

module.exports = Movements
