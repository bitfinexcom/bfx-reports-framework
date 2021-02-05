'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

class SyncCollsManager {
  constructor (
    dao,
    TABLES_NAMES
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
  }

  _getCompletedCollBy (params = {}) {
    return this.dao.getElemInCollBy(
      this.TABLES_NAMES.COMPLETED_ON_FIRST_SYNC_COLLS,
      params
    )
  }

  async hasCollBeenSyncedAtLeastOnce (params) {
    const {
      userId,
      collName
    } = { ...params }

    const completedColl = await this._getCompletedCollBy({
      user_id: userId,
      collName
    })

    return (
      completedColl &&
      typeof completedColl === 'object' &&
      completedColl.collName === collName
    )
  }
}

decorate(injectable(), SyncCollsManager)
decorate(inject(TYPES.DAO), SyncCollsManager, 0)
decorate(inject(TYPES.TABLES_NAMES), SyncCollsManager, 1)

module.exports = SyncCollsManager
