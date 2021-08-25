'use strict'

const { decorateInjectable } = require('../../di/utils')

const {
  TimeAnalysisProcessingError
} = require('../../errors')
const ANALYZED_TABLE_NAMES = require('./analyzed-table-names')
const { isPublic } = require('../schema/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.TABLES_NAMES,
  TYPES.SyncSchema,
  TYPES.Authenticator,
  TYPES.SyncCollsManager,
  TYPES.PublicСollsСonfAccessors
]
class TimeAnalysis {
  constructor (
    dao,
    TABLES_NAMES,
    syncSchema,
    authenticator,
    syncCollsManager,
    publicСollsСonfAccessors
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.syncSchema = syncSchema
    this.authenticator = authenticator
    this.syncCollsManager = syncCollsManager
    this.publicСollsСonfAccessors = publicСollsСonfAccessors

    this._methodCollMap = this.syncSchema.getMethodCollMap()
    this._ANALYZED_TABLE_NAMES_ARR = Object
      .entries(ANALYZED_TABLE_NAMES)
  }

  async getTimeAnalysis (args = {}) {
    const auth = await this.authenticator
      .verifyRequestUser(args)

    const resPromises = this._ANALYZED_TABLE_NAMES_ARR
      .map(([apiMethodName, tableName]) => {
        return this._getTimeAnalysisForOne(
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

  async _getTimeAnalysisForOne (
    auth,
    apiMethodName,
    tableName
  ) {
    const { _id: userId } = auth
    const schema = this._methodCollMap.get(apiMethodName)

    if (
      !schema ||
      typeof schema !== 'object'
    ) {
      throw new TimeAnalysisProcessingError({ data: { tableName } })
    }

    const {
      dateFieldName,
      sort,
      type
    } = schema

    const hasNotSynced = await this._hasNotCollBeenSyncedAtLeastOnce(
      auth,
      apiMethodName,
      type
    )

    if (hasNotSynced) {
      return { tableName, mts: null }
    }

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

    const _isPublic = isPublic(type)
    let publicCollMts = 0

    if (_isPublic) {
      const confName = `${tableName}Conf`
      const publicСollsСonf = await this.publicСollsСonfAccessors
        .getPublicСollsСonf(confName, { auth })

      if (
        Array.isArray(publicСollsСonf) &&
        publicСollsСonf.length !== 0
      ) {
        publicCollMts = publicСollsСonf.reduce((mts, currConf) => {
          if (
            !currConf ||
            typeof currConf !== 'object' ||
            !Number.isFinite(currConf.start) ||
            (mts !== 0 && mts < currConf.start)
          ) {
            return mts
          }

          return currConf.start
        }, publicCollMts)
      }
      if (!publicCollMts) {
        return { tableName, mts: null }
      }
    }

    const sortToFetchOldest = this._invertOrder(sort)
    const filter = _isPublic
      ? {}
      : { user_id: userId }
    const elem = await this.dao.getElemInCollBy(
      tableName,
      filter,
      sortToFetchOldest
    )

    if (
      !elem ||
      typeof elem !== 'object' ||
      !Number.isInteger(elem[dateFieldName])
    ) {
      return { tableName, mts: null }
    }

    const mts = Math.max(publicCollMts, elem[dateFieldName])

    return { tableName, mts }
  }

  async _hasNotCollBeenSyncedAtLeastOnce (
    auth,
    apiMethodName,
    type
  ) {
    const {
      _id: userId,
      subUsers,
      isSubAccount
    } = auth

    if (isPublic(type)) {
      const isValid = await this.syncCollsManager
        .hasCollBeenSyncedAtLeastOnce({
          collName: apiMethodName
        })

      return !isValid
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

      return areAllValid.every((isValid) => !isValid)
    }

    const isValid = await this.syncCollsManager
      .hasCollBeenSyncedAtLeastOnce({
        userId,
        collName: apiMethodName
      })

    return !isValid
  }

  _invertOrder (sort) {
    return sort.map(([name, order]) => ([name, -order]))
  }
}

decorateInjectable(TimeAnalysis, depsTypes)

module.exports = TimeAnalysis
