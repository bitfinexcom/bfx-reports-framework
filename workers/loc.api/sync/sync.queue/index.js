'use strict'

const EventEmitter = require('events')
const { isEmpty } = require('lib-js-util-base')

const COLLS_TYPES = require('../schema/colls.types')

const {
  checkCollPermission
} = require('../helpers')
const {
  UpdateSyncQueueJobError,
  SyncQueueOwnerSettingError
} = require('../../errors')

const {
  LOCKED_JOB_STATE,
  NEW_JOB_STATE,
  FINISHED_JOB_STATE,
  ERROR_JOB_STATE
} = require('./sync.queue.states')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.TABLES_NAMES,
  TYPES.ALLOWED_COLLS,
  TYPES.DAO,
  TYPES.DataInserterFactory,
  TYPES.Progress,
  TYPES.SyncSchema,
  TYPES.SyncInterrupter
]
class SyncQueue extends EventEmitter {
  constructor (
    TABLES_NAMES,
    ALLOWED_COLLS,
    dao,
    dataInserterFactory,
    progress,
    syncSchema,
    syncInterrupter
  ) {
    super()

    this.TABLES_NAMES = TABLES_NAMES
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.dao = dao
    this.dataInserterFactory = dataInserterFactory
    this.progress = progress
    this.syncSchema = syncSchema
    this.syncInterrupter = syncInterrupter
    this.name = this.TABLES_NAMES.SYNC_QUEUE

    this.methodCollMap = this._filterMethodCollMap(
      this.syncSchema.getMethodCollMap(),
      new RegExp(`^(?!${COLLS_TYPES.HIDDEN})`, 'i')
    )
    this.privMethodCollMap = this._filterMethodCollMap(
      this.methodCollMap,
      new RegExp(`^(?!${COLLS_TYPES.PUBLIC})`, 'i')
    )
    this.pubMethodCollMap = this._filterMethodCollMap(
      this.methodCollMap,
      new RegExp(`^${COLLS_TYPES.PUBLIC}`, 'i')
    )

    this.allMultipliers = this._getAllMultipliers()

    this._sort = [['_id', 1]]
    this._isFirstSync = true

    this._progress = this.syncInterrupter.INITIAL_PROGRESS
  }

  setName (name) {
    this.name = name
  }

  async add (params) {
    const {
      syncColls,
      ownerUserId,
      isOwnerScheduler
    } = params ?? {}

    if (
      !Number.isInteger(ownerUserId) &&
      !isOwnerScheduler
    ) {
      throw new SyncQueueOwnerSettingError()
    }

    const _syncColls = Array.isArray(syncColls)
      ? syncColls
      : [syncColls]
    checkCollPermission(_syncColls, this.ALLOWED_COLLS)

    const ownerUserIdFilter = Number.isInteger(ownerUserId)
      ? { ownerUserId }
      : {}
    const isOwnerSchedulerFilter = isOwnerScheduler
      ? { isOwnerScheduler: 1 }
      : {}

    const allSyncs = await this._getAll({
      state: [NEW_JOB_STATE, ERROR_JOB_STATE],
      ...ownerUserIdFilter,
      ...isOwnerSchedulerFilter
    })
    const hasALLInDB = allSyncs.some(item => {
      return item.collName === this.ALLOWED_COLLS.ALL
    })

    if (hasALLInDB) return

    const uSyncColls = isEmpty(allSyncs)
      ? _syncColls
      : this._getUniqueNames(allSyncs, _syncColls)
    const data = uSyncColls.map(collName => {
      return {
        collName,
        state: NEW_JOB_STATE,
        ownerUserId,
        isOwnerScheduler
      }
    })

    await this.dao.insertElemsToDb(
      this.name,
      null,
      data
    )
  }

  async process (params) {
    this._progress = this.syncInterrupter.INITIAL_PROGRESS

    const prevSyncs = []
    let count = 0
    let multiplier = 0

    while (true) {
      if (this.syncInterrupter.hasInterrupted()) {
        break
      }

      count += 1

      const nextSync = await this._getNext(params)

      if (
        !nextSync ||
        typeof nextSync !== 'object' ||
        count > 10
      ) {
        break
      }

      const { _id } = nextSync

      await this._updateStateById(_id, LOCKED_JOB_STATE)
      multiplier = await this._subProcess(nextSync, prevSyncs, params, multiplier)

      if (this.syncInterrupter.hasInterrupted()) {
        await this._updateStateById(_id, NEW_JOB_STATE)

        break
      }

      await this._updateStateById(_id, FINISHED_JOB_STATE)
      prevSyncs.push(nextSync)
    }

    /*
     * Remove finished sync jobs from the queue
     * leaving the last 100 for debug purposes
     */
    await this._removeByState(FINISHED_JOB_STATE)

    if (!this.syncInterrupter.hasInterrupted()) {
      await this.setProgress(100)
    }

    return this._progress
  }

  async _subProcess (nextSync, prevSyncs, params, multiplier) {
    const {
      ownerUserId,
      isOwnerScheduler
    } = params ?? {}
    const {
      _id,
      collName
    } = nextSync ?? {}
    let currMultiplier = 0

    try {
      const dataInserter = this.dataInserterFactory({
        syncColls: collName,
        syncQueueId: _id,
        ownerUserId,
        isOwnerScheduler
      })

      dataInserter.addAsyncProgressHandler(async (progress) => {
        currMultiplier = await this._getMultiplier({
          prevSyncs,
          syncQueueId: _id,
          ownerUserId,
          isOwnerScheduler
        })

        return this._asyncProgressHandler(
          currMultiplier,
          multiplier,
          progress
        )
      })

      await dataInserter.insertNewDataToDbMultiUser()
    } catch (err) {
      await this._updateStateById(_id, ERROR_JOB_STATE)

      throw err
    }

    return multiplier + currMultiplier
  }

  _filterMethodCollMap (methodCollMap, regExp) {
    return new Map([...methodCollMap]
      .filter(([key, { type }]) => (regExp.test(type))))
  }

  _getAllMultipliers () {
    const allowedColls = Object.values(this.ALLOWED_COLLS)

    return allowedColls.reduce((accum, curr) => {
      if (curr === this.ALLOWED_COLLS.ALL) {
        return { ...accum, [curr]: 1 }
      }
      if (curr === this.ALLOWED_COLLS.PRIVATE) {
        return {
          ...accum,
          [curr]: this.privMethodCollMap.size / this.methodCollMap.size
        }
      }
      if (curr === this.ALLOWED_COLLS.PUBLIC) {
        return {
          ...accum,
          [curr]: this.pubMethodCollMap.size / this.methodCollMap.size
        }
      }

      return {
        ...accum,
        [curr]: 1 / this.methodCollMap.size
      }
    }, {})
  }

  async _getMultipliers (params) {
    const {
      ownerUserId,
      prevSyncs
    } = params ?? {}

    const ownerUserIdFilter = Number.isInteger(ownerUserId)
      ? { ownerUserId }
      : {}

    const futureSyncs = await this._getAll({
      state: [
        NEW_JOB_STATE,
        LOCKED_JOB_STATE,
        ERROR_JOB_STATE
      ],
      ...ownerUserIdFilter
    }, { limit: 10 })

    const allSyncs = (
      !Array.isArray(futureSyncs) ||
      futureSyncs.length === 0
    )
      ? prevSyncs
      : [...prevSyncs, ...futureSyncs]

    if (allSyncs.length === 0) {
      return {}
    }

    return allSyncs.reduce((accum, syncColls) => {
      const {
        _id,
        collName
      } = syncColls ?? {}

      if (!Number.isFinite(this.allMultipliers[collName])) {
        return accum
      }

      accum[_id] = this.allMultipliers[collName]

      return accum
    }, {})
  }

  _sumMultipliers (multipliers) {
    return Object.values(multipliers)
      .reduce((accum, curr) => {
        return Number.isFinite(curr)
          ? accum + curr
          : accum
      }, 0)
  }

  async _getMultiplier (params) {
    const { syncQueueId } = params ?? {}

    const multipliers = await this._getMultipliers(params)
    const multipliersSum = this._sumMultipliers(multipliers)
    const currMultipliers = multipliers[syncQueueId]

    if (
      !Number.isFinite(currMultipliers) ||
      currMultipliers === 0 ||
      !Number.isFinite(multipliersSum) ||
      multipliersSum === 0
    ) {
      return 0
    }

    return (1 / multipliersSum) * currMultipliers
  }

  _getAll (filter, opts) {
    const {
      sort = this._sort,
      limit = null
    } = opts ?? {}

    return this.dao.getElemsInCollBy(
      this.name,
      {
        sort,
        filter,
        limit
      }
    )
  }

  _getUniqueNames (allSyncs, syncColls) {
    return syncColls.reduce((accum, curr) => {
      if (
        allSyncs.every(item => item.collName !== curr) &&
        accum.every(item => item !== curr)
      ) {
        accum.push(curr)
      }

      return accum
    }, [])
  }

  _getNext (params) {
    const {
      ownerUserId
    } = params ?? {}

    const ownerUserIdFilter = Number.isInteger(ownerUserId)
      ? { ownerUserId }
      : {}

    const state = [NEW_JOB_STATE, ERROR_JOB_STATE]

    if (this._isFirstSync) {
      this._isFirstSync = false

      state.push(LOCKED_JOB_STATE)
    }

    return this.dao.getElemInCollBy(
      this.name,
      { state, ...ownerUserIdFilter },
      this._sort
    )
  }

  _removeByState (state) {
    return this.dao.removeElemsLeaveLastNRecords(
      this.name,
      {
        filter: { state },
        limit: 100,
        sort: [['updatedAt', -1], ['_id', -1]]
      }
    )
  }

  async _updateById (id, data) {
    const res = await this.dao.updateCollBy(
      this.name,
      { _id: id },
      data
    )

    if (res && res.changes < 1) {
      throw new UpdateSyncQueueJobError(id)
    }
  }

  _updateStateById (id, state) {
    return this._updateById(id, { state })
  }

  async _asyncProgressHandler (
    currMultiplier,
    multiplier,
    progress
  ) {
    if (currMultiplier === 0 || progress === 0) {
      return
    }

    const prevProgress = multiplier * 100
    const currProgress = Math.round(
      prevProgress + (progress * currMultiplier)
    )

    if (progress < 100) {
      await this.setProgress(currProgress)
    }
  }

  async setProgress (progress) {
    this._progress = progress

    await this.progress.setProgress(progress)

    this.emit('progress', progress)
  }
}

decorateInjectable(SyncQueue, depsTypes)

module.exports = SyncQueue
