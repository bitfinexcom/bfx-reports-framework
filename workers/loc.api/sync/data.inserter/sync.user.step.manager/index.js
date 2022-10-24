'use strict'

const {
  isEmpty,
  merge,
  omit,
  min,
  max
} = require('lodash')

const {
  isPublic
} = require('../../schema/utils')
const {
  invertOrders
} = require('./helpers')
const SyncTempTablesManager = require('../sync.temp.tables.manager')
const SyncUserStepData = require('./sync.user.step.data')

const { decorateInjectable } = require('../../../di/utils')

const {
  SyncQueueIDSettingError,
  LastSyncedInfoGettingError,
  SyncInfoUpdatingError
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

  shouldBaseStepBeSynced (syncUserStepData, opts) {
    const {
      shouldNotMtsBeChecked,
      shouldStartMtsBeChecked
    } = opts ?? {}

    if (!(syncUserStepData instanceof SyncUserStepData)) {
      return false
    }
    if (
      !syncUserStepData?.isBaseStepReady &&
      (
        shouldNotMtsBeChecked ||
        syncUserStepData?.hasBaseStep
      ) &&
      (
        !shouldStartMtsBeChecked ||
        syncUserStepData?.hasBaseStart
      )
    ) {
      return true
    }

    return false
  }

  shouldCurrStepBeSynced (syncUserStepData, opts) {
    const {
      shouldNotMtsBeChecked,
      shouldStartMtsBeChecked
    } = opts ?? {}

    if (!(syncUserStepData instanceof SyncUserStepData)) {
      return false
    }
    if (
      !syncUserStepData?.isCurrStepReady &&
      (
        shouldNotMtsBeChecked ||
        syncUserStepData?.hasCurrStep
      ) &&
      (
        !shouldStartMtsBeChecked ||
        syncUserStepData?.hasCurrStart
      )
    ) {
      return true
    }

    return false
  }

  wereStepsSynced (syncUserStepsData = [], opts) {
    const isBaseStepReadyParam = this._wereBaseStepsSynced(syncUserStepsData, opts)
      ? { isBaseStepReady: true }
      : {}
    const isCurrStepReadyParam = this._wereCurrStepsSynced(syncUserStepsData, opts)
      ? { isCurrStepReady: true }
      : {}

    return {
      ...isBaseStepReadyParam,
      ...isCurrStepReadyParam
    }
  }

  async updateOrInsertSyncInfoForCurrColl (params) {
    const {
      collName,
      subUserId,
      userId,
      syncUserStepData
    } = params ?? {}
    const hasUserIdField = Number.isInteger(userId)
    const hasSubUserIdField = Number.isInteger(subUserId)

    if (
      !collName ||
      typeof collName !== 'string'
    ) {
      throw new SyncInfoUpdatingError()
    }

    const syncUserStepDataParams = syncUserStepData
      ?.getParams?.({ areStoringParamsReturned: true }) ?? {}

    const syncInfo = {
      ...syncUserStepDataParams,
      ...omit(params, ['syncUserStepData', 'userId']),
      user_id: userId,
      syncQueueId: this.syncQueueId
    }

    const userIdFilter = hasUserIdField
      ? { $eq: { user_id: userId } }
      : {}
    const subUserIdFilter = hasSubUserIdField
      ? { $eq: { subUserId } }
      : {}
    const filter = merge(
      { $eq: { collName } },
      userIdFilter,
      subUserIdFilter
    )

    const updateRes = await this.dao.updateCollBy(
      this.TABLES_NAMES.SYNC_USER_STEPS,
      filter,
      syncInfo
    )

    if (updateRes?.changes > 0) {
      return
    }

    await this.dao.insertElemToDb(
      this.TABLES_NAMES.SYNC_USER_STEPS,
      syncInfo,
      { isReplacedIfExists: true }
    )
  }

  async getLastSyncedInfoForCurrColl (syncSchema, params) {
    const {
      collName,
      userId,
      subUserId,
      symbol,
      timeframe,
      defaultStart = 0,
      currMts = Date.now()
    } = params ?? {}
    const {
      name: tableName,
      dateFieldName,
      symbolFieldName,
      timeframeFieldName,
      sort: tableOrder,
      model
    } = syncSchema ?? {}

    const hasUserIdField = (
      typeof model?.user_id === 'string' &&
      Number.isInteger(userId)
    )
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
    const shouldCollBePublic = !hasUserIdField
    const shouldTableDataBeFetched = (
      dateFieldName &&
      typeof dateFieldName === 'string'
    )

    if (isPublic(syncSchema?.type) !== shouldCollBePublic) {
      throw new LastSyncedInfoGettingError()
    }

    const tempTableName = this._getCurrTempTableName(tableName)
    const hasTempTable = await this.dao.hasTable(tempTableName)

    const userIdFilter = hasUserIdField
      ? { $eq: { user_id: userId } }
      : {}
    const subUserIdFilter = hasSubUserIdField
      ? { $eq: { subUserId } }
      : {}
    const symbolFilter = hasSymbolField
      ? { $eq: { [symbolFieldName]: symbol } }
      : {}
    const timeframeFilter = hasTimeframeField
      ? { $eq: { [timeframeFieldName]: timeframe } }
      : {}
    const dataFilter = merge(
      {},
      userIdFilter,
      subUserIdFilter,
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
    const lastElemFromMainTablePromise = shouldTableDataBeFetched
      ? this.dao.getElemInCollBy(
          tableName,
          dataFilter,
          tableOrder
        )
      : null
    const firstElemFromMainTablePromise = shouldTableDataBeFetched
      ? this.dao.getElemInCollBy(
          tableName,
          dataFilter,
          invertOrders(tableOrder)
        )
      : null
    const lastElemFromTempTablePromise = (
      hasTempTable &&
      shouldTableDataBeFetched
    )
      ? this.dao.getElemInCollBy(
          tempTableName,
          dataFilter,
          tableOrder
        )
      : null
    const firstElemFromTempTablePromise = (
      hasTempTable &&
      shouldTableDataBeFetched
    )
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
        baseStart: baseStart ?? defaultStart,
        baseEnd: baseEnd ?? currMts,
        isBaseStepReady,
        symbol,
        timeframe
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
      isCurrStepReady,
      symbol,
      timeframe
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

  _wereBaseStepsSynced (syncUserStepsData = [], opts) {
    if (
      !Array.isArray(syncUserStepsData) ||
      syncUserStepsData.length === 0
    ) {
      return false
    }

    const filteredSyncUserStepsData = syncUserStepsData
      .filter((syncUserStepData) => (
        this.shouldBaseStepBeSynced(syncUserStepData, opts))
      )

    if (filteredSyncUserStepsData.length === 0) {
      return false
    }

    return filteredSyncUserStepsData.every((syncUserStepData) => (
      syncUserStepData.wasBaseStepsBeSynced
    ))
  }

  _wereCurrStepsSynced (syncUserStepsData = [], opts) {
    if (
      !Array.isArray(syncUserStepsData) ||
      syncUserStepsData.length === 0
    ) {
      return false
    }

    const filteredSyncUserStepsData = syncUserStepsData
      .filter((syncUserStepData) => (
        this.shouldCurrStepBeSynced(syncUserStepData, opts))
      )

    if (filteredSyncUserStepsData.length === 0) {
      return false
    }

    return filteredSyncUserStepsData.every((syncUserStepData) => (
      syncUserStepData.wasCurrStepsBeSynced
    ))
  }

  _getCurrTempTableName (tableName) {
    return SyncTempTablesManager.getTempTableName(
      tableName,
      this.syncQueueId
    )
  }
}

decorateInjectable(SyncUserStepManager, depsTypes)

module.exports = SyncUserStepManager
