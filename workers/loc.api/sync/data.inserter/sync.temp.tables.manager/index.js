'use strict'

const { decorateInjectable } = require('../../../di/utils')

const { SyncQueueIDSettingError } = require('../../../errors')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.TABLES_NAMES,
  TYPES.SyncSchema,
  TYPES.SYNC_API_METHODS
]
class SyncTempTablesManager {
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

  async createTempDBStructureForSync (methodCollMap) {
    const models = [...methodCollMap]
      .map(([method, schema]) => [schema.name, schema.model])
    const namePrefix = this._getNamePrefix()

    await this.dao.createDBStructure({ models, namePrefix })
  }

  _getNamePrefix () {
    return `temp_s${this.syncQueueId}_`
  }
}

decorateInjectable(SyncTempTablesManager, depsTypes)

module.exports = SyncTempTablesManager
