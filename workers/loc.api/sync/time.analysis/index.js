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

      const {
        dateFieldName,
        sort
      } = this._methodCollMap.get(apiMethodName)

      if (
        !dateFieldName ||
        typeof dateFieldName !== 'string' ||
        !Array.isArray(sort) ||
        sort.length === 0 ||
        sort.every((item) => (
          !Array.isArray(item) ||
          typeof item[0] !== 'string' ||
          !Number.isInteger(item[1])
        ))
      ) {
        throw new Error('ERR_TABLE_NAME_BEING_PROCESSED_DOES_NOT_SUPPORT_TIME_ANALYSIS')
      }

      const sortToFetchOldest = this._invertOrder(sort)

      const elem = await this.dao.getElemInCollBy(
        tableName,
        { user_id: userId },
        sortToFetchOldest
      )

      if (
        !elem ||
        typeof elem !== 'object' ||
        !Number.isInteger(elem[dateFieldName])
      ) {
        res[tableName] = null

        continue
      }

      res[tableName] = elem[dateFieldName]
    }

    return res
  }

  _invertOrder (sort) {
    return sort.map(([name, order]) => ([name, -order]))
  }
}

decorateInjectable(TimeAnalysis, depsTypes)

module.exports = TimeAnalysis
