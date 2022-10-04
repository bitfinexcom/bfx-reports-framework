'use strict'

const {
  isEmpty,
  merge,
  min,
  max
} = require('lodash')

const {
  isInsertableArrObjTypeOfColl
} = require('../../schema/utils')
const {
  invertOrders
} = require('./helpers')
const SyncTempTablesManager = require('../sync.temp.tables.manager')

const { decorateInjectable } = require('../../../di/utils')

const {
  SyncQueueIDSettingError,
  LastSyncedInfoGettingError
} = require('../../../errors')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.TABLES_NAMES,
  TYPES.SyncSchema,
  TYPES.SYNC_API_METHODS,
  TYPES.SyncUserStepDataFactory
]
class SyncUserStepManager {
  constructor (
    dao,
    TABLES_NAMES,
    syncSchema,
    SYNC_API_METHODS,
    syncUserStepDataFactory
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.syncSchema = syncSchema
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.syncUserStepDataFactory = syncUserStepDataFactory

    this.syncQueueId = null

    this._methodCollMap = this.syncSchema.getMethodCollMap()
  }

  init (params = {}) {
    if (!Number.isInteger(params?.syncQueueId)) {
      throw new SyncQueueIDSettingError()
    }

    this.syncQueueId = params.syncQueueId
  }

  async getLastSyncedInfoForCurrColl (syncSchema, params) {
    if (!isInsertableArrObjTypeOfColl(syncSchema)) {
      throw new LastSyncedInfoGettingError()
    }

    const currMts = Date.now()
    const {
      collName,
      userId,
      subUserId,
      symbol,
      timeframe,
      defaultStart = 0
    } = params ?? {}
    const {
      name: tableName,
      dateFieldName,
      symbolFieldName,
      timeframeFieldName,
      sort: tableOrder,
      model
    } = syncSchema ?? {}

    const hasSubUserIdField = (
      typeof model?.subUserId === 'string' &&
      Number.isInteger(subUserId)
    )
    const hasSymbolField = (
      symbolFieldName &&
      typeof model?.[symbolFieldName] === 'string' &&
      symbol &&
      typeof symbol === 'string'
    )
    const hasTimeframeField = (
      timeframeFieldName &&
      typeof model?.[timeframeFieldName] === 'string' &&
      timeframe &&
      typeof timeframe === 'string'
    )

    const tempTableName = this._getCurrNamePrefix()
    const hasTempTable = await this.dao.hasTable(tempTableName)

    const userIdFilter = hasSubUserIdField
      ? { $eq: { user_id: userId, subUserId } }
      : { $eq: { user_id: userId } }
    const symbolFilter = hasSymbolField
      ? { $eq: { [symbolFieldName]: symbol } }
      : {}
    const timeframeFilter = hasTimeframeField
      ? { $eq: { [timeframeFieldName]: timeframe } }
      : {}
    const dataFilter = merge(
      userIdFilter,
      symbolFilter,
      timeframeFilter
    )

    const syncUserStepInfoPromise = this.dao.getElemInCollBy(
      this.TABLES_NAMES.SYNC_USER_STEPS,
      {
        collName,
        ...userIdFilter
      },
      [['syncedAt', -1]]
    )
    const lastElemFromMainTablePromise = this.dao.getElemInCollBy(
      tableName,
      dataFilter,
      tableOrder
    )
    const firstElemFromMainTablePromise = this.dao.getElemInCollBy(
      tableName,
      dataFilter,
      invertOrders(tableOrder)
    )
    const lastElemFromTempTablePromise = hasTempTable
      ? this.dao.getElemInCollBy(
          tempTableName,
          dataFilter,
          tableOrder
        )
      : null
    const firstElemFromTempTablePromise = hasTempTable
      ? this.dao.getElemInCollBy(
          tempTableName,
          dataFilter,
          invertOrders(tableOrder)
        )
      : null

    const [
      syncUserStepInfo,
      lastElemFromMainTable,
      firstElemFromMainTable,
      lastElemFromTempTable,
      firstElemFromTempTable
    ] = await Promise.all([
      syncUserStepInfoPromise,
      lastElemFromMainTablePromise,
      firstElemFromMainTablePromise,
      lastElemFromTempTablePromise,
      firstElemFromTempTablePromise
    ])

    const {
      baseStart,
      baseEnd,
      currStart,
      currEnd,
      isBaseStepReady = false,
      isCurrStepReady = false
    } = syncUserStepInfo ?? {}

    const isMainTableEmpty = isEmpty(lastElemFromMainTable)
    const isTempTableEmpty = isEmpty(lastElemFromTempTable)
    const firstElemMtsFromMainTable = firstElemFromMainTable?.[dateFieldName] ?? null
    const lastElemMtsFromMainTable = lastElemFromMainTable?.[dateFieldName] ?? null
    const firstElemMtsFromTempTable = firstElemFromTempTable?.[dateFieldName] ?? null
    const lastElemMtsFromTempTable = lastElemFromTempTable?.[dateFieldName] ?? null
    const lastElemMtsFromTables = max([lastElemMtsFromTempTable, lastElemMtsFromMainTable]) ?? defaultStart

    if (
      !isBaseStepReady &&
      isMainTableEmpty &&
      isTempTableEmpty
    ) {
      const syncUserStepData = this.syncUserStepDataFactory({
        baseStart: baseStart ?? 0,
        baseEnd: baseEnd ?? currMts,
        isBaseStepReady
      })

      return {
        syncUserStepData,
        lastElemMtsFromTables
      }
    }

    const syncUserStepData = this.syncUserStepDataFactory({
      baseStart,
      baseEnd,
      currStart,
      currEnd,
      isBaseStepReady,
      isCurrStepReady
    })

    if (!isCurrStepReady) {
      syncUserStepData.setParams({
        currStart: min([currStart, lastElemMtsFromMainTable]) ?? defaultStart,
        currEnd: min([currEnd, firstElemMtsFromTempTable]) ?? lastElemMtsFromMainTable ?? currMts
      })
    }
    if (!isBaseStepReady) {
      syncUserStepData.setParams({
        baseStart: min([baseStart, firstElemMtsFromMainTable]) ?? defaultStart,
        baseEnd: min([baseEnd, firstElemMtsFromTempTable]) ?? lastElemMtsFromMainTable ?? currMts
      })
    }

    return {
      syncUserStepData,
      lastElemMtsFromTables
    }
  }

  _getCurrNamePrefix (id) {
    const syncQueueId = id ?? this.syncQueueId

    return SyncTempTablesManager._getNamePrefix(syncQueueId)
  }
}

decorateInjectable(SyncUserStepManager, depsTypes)

module.exports = SyncUserStepManager
