'use strict'

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.TABLES_NAMES,
  TYPES.SyncSchema,
  TYPES.Authenticator
]
class TimeAnalysis {
  constructor (
    dao,
    TABLES_NAMES,
    syncSchema,
    authenticator
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.syncSchema = syncSchema
    this.authenticator = authenticator

    this._methodCollMap = this.syncSchema.getMethodCollMap()
  }

  async getTimeAnalysis (args = {}) {
    const { auth = {} } = args

    const user = await this.authenticator
      .verifyRequestUser({ auth })
  }
}

decorateInjectable(TimeAnalysis, depsTypes)

module.exports = TimeAnalysis
