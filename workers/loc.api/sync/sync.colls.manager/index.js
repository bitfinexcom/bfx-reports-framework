'use strict'

const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const {
  isHidden,
  isPublic
} = require('../schema/utils')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.TABLES_NAMES,
  TYPES.SyncSchema
]
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

  _getSchemaNodes (schema) {
    if (Array.isArray(schema)) {
      if (schema.length === 0) {
        return []
      }

      return schema.map((item) => {
        if (typeof item === 'string') {
          return [item, { allowedDiffInMs: null }]
        }
        if (
          Array.isArray(item) &&
          item[0] &&
          typeof item[0] === 'string'
        ) {
          return [
            item[0],
            Number.isInteger(item[1])
              ? { allowedDiffInMs: item[1] }
              : item[1]
          ]
        }

        return []
      })
    }

    return Object.entries(schema)
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

  async haveCollsBeenSyncedUpToDate (args) {
    const { auth, params } = { ...args }
    const { _id: userId } = auth
    const {
      schema,
      commonAllowedDiffInMs = 24 * 60 * 60 * 1000
    } = { ...params }

    const completedColls = await this._getCompletedCollsBy({
      $or: {
        $eq: { user_id: userId },
        $isNull: ['user_id']
      }
    })

    if (
      !Array.isArray(completedColls) ||
      completedColls.length === 0 ||
      !schema ||
      typeof schema !== 'object'
    ) {
      return false
    }

    const schemaNodes = this._getSchemaNodes(schema)

    if (schemaNodes.length === 0) {
      return false
    }

    const completedCollsForAllNodes = completedColls
      .filter((completedColl) => (
        completedColl &&
        typeof completedColl === 'object' &&
        schemaNodes.some(([collName]) => (
          completedColl.collName === collName
        ))
      ))

    for (const node of schemaNodes) {
      const [collName, props] = node
      const _props = Number.isInteger(props)
        ? { allowedDiffInMs: props }
        : props
      const { allowedDiffInMs } = { ..._props }
      const _allowedDiffInMs = Number.isInteger(allowedDiffInMs)
        ? allowedDiffInMs
        : commonAllowedDiffInMs

      if (!Number.isInteger(_allowedDiffInMs)) {
        return false
      }

      const completedCollsForCurrNode = completedCollsForAllNodes
        .filter((completedColl) => (
          completedColl.collName === collName
        ))

      if (completedCollsForCurrNode.length === 0) {
        return false
      }

      const isOk = completedCollsForCurrNode
        .every((completedColl) => (
          completedCollsForAllNodes.every(({ _id, mts }) => (
            (
              _id &&
              completedColl._id === _id
            ) ||
            (
              Number.isInteger(mts) &&
              Number.isInteger(completedColl.mts) &&
              Math.abs(completedColl.mts - mts) <= _allowedDiffInMs
            )
          ))
        ))

      if (!isOk) {
        return false
      }
    }

    return true
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

decorateInjectable(SyncCollsManager, depsTypes)

module.exports = SyncCollsManager
