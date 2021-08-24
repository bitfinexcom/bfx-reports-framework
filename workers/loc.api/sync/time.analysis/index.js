'use strict'

const { decorateInjectable } = require('../../di/utils')

const {
  TimeAnalysisProcessingError
} = require('../../errors')
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

    const resPromises = this._ANALYZED_TABLE_NAMES_ARR
      .map(([apiMethodName, tableName]) => {
        return this.getTimeAnalysisForOne(
          auth,
          apiMethodName,
          tableName
        )
      })
    const resArr = await Promise.all(resPromises)

    const res = resArr.reduce((accum, curr) => {
      const { tableName, mts } = curr

      accum[tableName] = mts

      return accum
    }, {})

    return res
  }

  async getTimeAnalysisForOne (auth, apiMethodName, tableName) {
    const {
      _id: userId,
      subUsers,
      isSubAccount
    } = auth

    const schema = this._methodCollMap.get(apiMethodName)

    if (
      !schema ||
      typeof schema !== 'object'
    ) {
      throw new TimeAnalysisProcessingError({ data: { tableName } })
    }

    if (!isSubAccount) {
      const isValid = await this.syncCollsManager
        .hasCollBeenSyncedAtLeastOnce({
          userId,
          collName: apiMethodName
        })

      if (!isValid) {
        return { tableName, mts: null }
      }
    }
    if (isSubAccount) {
      const areAllValidPromise = subUsers.map((subUser) => {
        const { _id: subUserId } = { ...subUser }

        return this.syncCollsManager
          .hasCollBeenSyncedAtLeastOnce({
            userId,
            subUserId,
            collName: apiMethodName
          })
      })
      const areAllValid = await Promise.all(areAllValidPromise)

      if (areAllValid.some((isValid) => !isValid)) {
        return { tableName, mts: null }
      }
    }

    const {
      dateFieldName,
      sort
    } = schema

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
      throw new TimeAnalysisProcessingError({ data: { tableName } })
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
      return { tableName, mts: null }
    }

    return { tableName, mts: elem[dateFieldName] }
  }

  _invertOrder (sort) {
    return sort.map(([name, order]) => ([name, -order]))
  }
}

decorateInjectable(TimeAnalysis, depsTypes)

module.exports = TimeAnalysis
