'use strict'

const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

const {
  isHidden,
  isPublic
} = require('../schema/utils')

class SyncCollsManager {
  constructor (
    dao,
    TABLES_NAMES,
    syncSchema
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.syncSchema = syncSchema

    this._methodCollMap = this.syncSchema.getMethodCollMap()
  }

  _getCompletedCollBy (filter = {}) {
    return this.dao.getElemInCollBy(
      this.TABLES_NAMES.COMPLETED_ON_FIRST_SYNC_COLLS,
      filter
    )
  }

  _getCompletedCollsBy (filter = {}) {
    return this.dao.getElemsInCollBy(
      this.TABLES_NAMES.COMPLETED_ON_FIRST_SYNC_COLLS,
      { filter }
    )
  }

  async hasCollBeenSyncedAtLeastOnce (params) {
    const {
      userId,
      subUserId,
      collName
    } = { ...params }

    const subUserIdFilter = Number.isInteger(subUserId)
      ? { subUserId }
      : {}

    const completedColl = await this._getCompletedCollBy({
      user_id: userId,
      collName,
      ...subUserIdFilter
    })

    return (
      completedColl &&
      typeof completedColl === 'object' &&
      completedColl.collName === collName
    )
  }

  async haveCollsBeenSyncedAtLeastOnce (args) {
    const { auth } = { ...args }
    const {
      _id: userId,
      subUsers,
      isSubAccount
    } = auth

    const completedColls = await this._getCompletedCollsBy({
      $or: {
        $eq: { user_id: userId },
        $isNull: ['user_id']
      }
    })

    if (
      !Array.isArray(completedColls) ||
      completedColls.length === 0
    ) {
      return false
    }
    if (
      isSubAccount &&
      (
        !Array.isArray(subUsers) ||
        subUsers.length === 0
      )
    ) {
      throw new AuthError()
    }

    const checkingRes = []

    for (const [method, schema] of this._methodCollMap) {
      const {
        type,
        isSyncRequiredAtLeastOnce
      } = schema

      if (
        isHidden(type) ||
        !isSyncRequiredAtLeastOnce
      ) {
        continue
      }
      if (isPublic(type)) {
        const isDone = completedColls.some((completedColl) => (
          completedColl &&
          typeof completedColl === 'object' &&
          completedColl.collName === method
        ))

        checkingRes.push(isDone)

        continue
      }
      if (isSubAccount) {
        const isDone = subUsers.every((subUser) => (
          subUser &&
          typeof subUser === 'object' &&
          Number.isInteger(subUser._id) &&
          completedColls.some((completedColl) => (
            completedColl &&
            typeof completedColl === 'object' &&
            completedColl.collName === method &&
            completedColl.user_id === userId &&
            completedColl.subUserId === subUser._id
          ))
        ))

        checkingRes.push(isDone)

        continue
      }

      const isDone = completedColls.some((completedColl) => (
        completedColl &&
        typeof completedColl === 'object' &&
        completedColl.collName === method &&
        completedColl.user_id === userId
      ))

      checkingRes.push(isDone)
    }

    return checkingRes.every((res) => res)
  }

  setCollAsSynced (params) {
    const {
      userId,
      subUserId,
      collName
    } = { ...params }

    return this.dao.insertElemToDb(
      this.TABLES_NAMES.COMPLETED_ON_FIRST_SYNC_COLLS,
      {
        collName,
        mts: Date.now(),
        subUserId,
        user_id: userId
      },
      { isReplacedIfExists: true }
    )
  }
}

decorate(injectable(), SyncCollsManager)
decorate(inject(TYPES.DAO), SyncCollsManager, 0)
decorate(inject(TYPES.TABLES_NAMES), SyncCollsManager, 1)
decorate(inject(TYPES.SyncSchema), SyncCollsManager, 2)

module.exports = SyncCollsManager
