'use strict'

const { decorateInjectable } = require('../../di/utils')

const ANALYZED_TABLE_NAMES = require('./analyzed-table-names')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.TABLES_NAMES,
  TYPES.SyncSchema,
  TYPES.Authenticator,
  TYPES.SyncCollsManager
]
class TimeAnalysis {
  constructor (
    dao,
    TABLES_NAMES,
    syncSchema,
    authenticator,
    syncCollsManager
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.syncSchema = syncSchema
    this.authenticator = authenticator
    this.syncCollsManager = syncCollsManager

    this._methodCollMap = this.syncSchema.getMethodCollMap()
    this._ANALYZED_TABLE_NAMES_ARR = Object
      .entries(ANALYZED_TABLE_NAMES)
  }

  async getTimeAnalysis (args = {}) {
    const auth = await this.authenticator
      .verifyRequestUser(args)

    const {
      _id: userId,
      subUsers,
      isSubAccount
    } = auth

    const res = {}

    for (const [apiMethodName, tableName] of this._ANALYZED_TABLE_NAMES_ARR) {
      if (!isSubAccount) {
        const isValid = await this.syncCollsManager
          .hasCollBeenSyncedAtLeastOnce({
            userId,
            tableName
          })

        if (!isValid) {
          res[tableName] = null

          continue
        }
      }
      if (isSubAccount) {
        const areAllValidPromise = subUsers.map((subUser) => {
          const { _id: subUserId } = { ...subUser }

          return this.syncCollsManager
            .hasCollBeenSyncedAtLeastOnce({
              userId,
              subUserId,
              tableName
            })
        })
        const areAllValid = await Promise.all(areAllValidPromise)

        if (areAllValid.some((isValid) => !isValid)) {
          res[tableName] = null

          continue
        }
      }

      // TODO: common check up
    }

    return res
  }
}

decorateInjectable(TimeAnalysis, depsTypes)

module.exports = TimeAnalysis
