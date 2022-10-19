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
  TYPES.SyncSchema,
  TYPES.SYNC_API_METHODS
]
class SyncCollsManager {
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

    this._methodCollMap = this.syncSchema.getMethodCollMap()
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
      isBaseStepReady: true,
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
    const {
      _id: userId,
      subUsers,
      isSubAccount
    } = args?.auth ?? {}

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
          completedColl?.isBaseStepReady &&
          completedColl?.collName === method
        ))

        checkingRes.push(isDone)

        continue
      }
      if (isSubAccount) {
        const isDone = subUsers.every((subUser) => (
          Number.isInteger(subUser?._id) &&
          completedColls.some((completedColl) => (
            completedColl?.isBaseStepReady &&
            completedColl?.collName === method &&
            completedColl?.user_id === userId &&
            completedColl?.subUserId === subUser._id
          ))
        ))
        const isLedgerMovementsDone = !isDone
          ? await this._haveLedgerMovementsBeenSyncedAtLeastOnce(
              args,
              { method, completedColls }
            )
          : false

        checkingRes.push(isDone || isLedgerMovementsDone)

        continue
      }

      const isDone = completedColls.some((completedColl) => (
        completedColl?.isBaseStepReady &&
        completedColl?.collName === method &&
        completedColl?.user_id === userId
      ))
      const isLedgerMovementsDone = !isDone
        ? await this._haveLedgerMovementsBeenSyncedAtLeastOnce(
            args,
            { method, completedColls }
          )
        : false

      checkingRes.push(isDone || isLedgerMovementsDone)
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
        completedColl?.isBaseStepReady &&
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

      const isOk = completedCollsForCurrNode
        .every((completedColl) => (
          completedCollsForAllNodes.every(({ _id, syncedAt }) => (
            (
              _id &&
              completedColl._id === _id
            ) ||
            (
              Number.isInteger(syncedAt) &&
              Number.isInteger(completedColl.syncedAt) &&
              Math.abs(completedColl.syncedAt - syncedAt) <= _allowedDiffInMs
            )
          ))
        ))

      if (!isOk) {
        return false
      }
    }

    return true
  }

  async _haveLedgerMovementsBeenSyncedAtLeastOnce (args, opts) {
    const {
      _id: userId,
      subUsers,
      isSubAccount
    } = args?.auth ?? {}
    const {
      method,
      completedColls = []
    } = opts ?? {}

    if (method !== this.SYNC_API_METHODS.MOVEMENTS) {
      return false
    }

    if (isSubAccount) {
      const isLedgersCollDone = subUsers.every((subUser) => (
        Number.isInteger(subUser?._id) &&
        completedColls.some((completedColl) => (
          completedColl?.isBaseStepReady &&
          completedColl?.collName === this.SYNC_API_METHODS.LEDGERS &&
          completedColl?.user_id === userId &&
          completedColl?.subUserId === subUser._id
        ))
      ))

      if (!isLedgersCollDone) {
        return false
      }
    }

    const isLedgersCollDone = completedColls.some((completedColl) => (
      completedColl?.isBaseStepReady &&
      completedColl?.collName === this.SYNC_API_METHODS.LEDGERS
    ))

    if (!isLedgersCollDone) {
      return false
    }

    const subAccountFilter = isSubAccount
      ? { $in: { subUserId: subUsers } }
      : {}
    const ledger = await this.dao.getElemInCollBy(
      this.TABLES_NAMES.LEDGERS,
      {
        $eq: { _isSubAccountsTransfer: 1 },
        user_id: userId,
        ...subAccountFilter
      }
    )

    return Number.isInteger(ledger?._id)
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

  _getCompletedCollBy (filter = {}) {
    return this.dao.getElemInCollBy(
      this.TABLES_NAMES.SYNC_USER_STEPS,
      filter
    )
  }

  _getCompletedCollsBy (filter = {}) {
    return this.dao.getElemsInCollBy(
      this.TABLES_NAMES.SYNC_USER_STEPS,
      { filter }
    )
  }
}

decorateInjectable(SyncCollsManager, depsTypes)

module.exports = SyncCollsManager
