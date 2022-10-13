'use strict'

const { decorateInjectable } = require('../../../di/utils')

const { SyncQueueIDSettingError } = require('../../../errors')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.TABLES_NAMES,
  TYPES.SyncSchema,
  TYPES.SYNC_API_METHODS,
  TYPES.SYNC_QUEUE_STATES
]
class SyncTempTablesManager {
  constructor (
    dao,
    TABLES_NAMES,
    syncSchema,
    SYNC_API_METHODS,
    SYNC_QUEUE_STATES
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.syncSchema = syncSchema
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.SYNC_QUEUE_STATES = SYNC_QUEUE_STATES

    this.syncQueueId = null

    this._methodCollMap = this.syncSchema.getMethodCollMap()
  }

  init (params = {}) {
    if (!Number.isInteger(params?.syncQueueId)) {
      throw new SyncQueueIDSettingError()
    }

    this.syncQueueId = params.syncQueueId
  }

  async createTempDBStructureForCurrSync (methodCollMap) {
    const models = [...methodCollMap]
      .map(([method, schema]) => [schema.name, schema.model])
    const namePrefix = this.getCurrNamePrefix()

    await this.dao.createDBStructure({ models, namePrefix })
  }

  async removeTempDBStructureForCurrSync (opts) {
    const { isNotInTrans } = opts ?? {}

    await this.dao.dropAllTables({
      expectations: [this.getCurrNamePrefix()],
      isNotStrictEqual: true,
      isNotInTrans
    })
  }

  async moveTempTableDataToMain () {
    await this.dao.moveTempTableDataToMain({
      namePrefix: this.getCurrNamePrefix()
    })
  }

  async cleanUpTempDBStructure () {
    /*
     * Don't remove temp DB tables of sync queue which can be processed
     * or/and sync can be continued in the future
     */
    const activeSyncs = await this.dao.getElemsInCollBy(
      this.TABLES_NAMES.SYNC_QUEUE,
      {
        sort: [['_id', 1]],
        filter: {
          state: [
            this.SYNC_QUEUE_STATES.NEW_JOB_STATE,
            this.SYNC_QUEUE_STATES.LOCKED_JOB_STATE,
            this.SYNC_QUEUE_STATES.ERROR_JOB_STATE
          ]
        }
      }
    )
    const exceptions = activeSyncs
      .map(({ _id }) => this.getCurrNamePrefix(_id))

    await this.dao.dropAllTables({
      exceptions,
      isNotStrictEqual: true
    })
  }

  getCurrNamePrefix (id) {
    const syncQueueId = id ?? this.syncQueueId

    return this.constructor.getNamePrefix(syncQueueId)
  }

  static getTempTableName (tableName, id) {
    const prefix = this.getNamePrefix(id)

    return `${prefix}${tableName}`
  }

  static getNamePrefix (id) {
    return `temp_s${id}_`
  }
}

decorateInjectable(SyncTempTablesManager, depsTypes)

module.exports = SyncTempTablesManager
