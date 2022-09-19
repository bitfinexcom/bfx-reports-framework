'use strict'

const {
  isInsertableArrObjTypeOfColl
} = require('../../schema/utils')
const SyncTempTablesManager = require('../sync.temp.tables.manager')

const { decorateInjectable } = require('../../../di/utils')

const { SyncQueueIDSettingError } = require('../../../errors')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.TABLES_NAMES,
  TYPES.SyncSchema,
  TYPES.SYNC_API_METHODS
]
class SyncUserStepManager {
  constructor (
    dao,
    TABLES_NAMES,
    syncSchema,
    SYNC_API_METHODS
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.syncSchema = syncSchema
    this.SYNC_API_METHODS = SYNC_API_METHODS

    this.syncQueueId = null

    this._methodCollMap = this.syncSchema.getMethodCollMap()
  }

  init (params = {}) {
    if (!Number.isInteger(params?.syncQueueId)) {
      throw new SyncQueueIDSettingError()
    }

    this.syncQueueId = params.syncQueueId
  }

  // TODO:
  async getLastSyncedInfoForCurrColl (syncSchema, params) {
    if (!isInsertableArrObjTypeOfColl(syncSchema)) {
      throw new Error('ERR_') // TODO:
    }

    const {
      collName,
      userId,
      subUserId
    } = params ?? {}

    const hasSubUserIdField = (
      typeof syncSchema?.model?.subUserId === 'string' &&
      Number.isInteger(subUserId)
    )
    const tableName = syncSchema.name
    const tempTableName = this._getCurrNamePrefix()
    const hasTempTable = await this.dao.hasTable(tempTableName)

    const userIdFilter = hasSubUserIdField
      ? { $eq: { user_id: userId, subUserId } }
      : { $eq: { user_id: userId } }

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
      userIdFilter,
      syncSchema.sort
    )
    const lastElemFromTempTablePromise = hasTempTable
      ? this.dao.getElemInCollBy(
          tempTableName,
          userIdFilter,
          syncSchema.sort
        )
      : null

    const [
      syncUserStepInfo,
      lastElemFromMainTable,
      lastElemFromTempTable
    ] = Promise.all([
      syncUserStepInfoPromise,
      lastElemFromMainTablePromise,
      lastElemFromTempTablePromise
    ])
  }

  _getCurrNamePrefix (id) {
    const syncQueueId = id ?? this.syncQueueId

    return SyncTempTablesManager._getNamePrefix(syncQueueId)
  }
}

decorateInjectable(SyncUserStepManager, depsTypes)

module.exports = SyncUserStepManager
