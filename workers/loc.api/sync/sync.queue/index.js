'use strict'

const EventEmitter = require('events')
const { isEmpty } = require('lodash')

const COLLS_TYPES = require('../schema/colls.types')

const {
  checkCollPermission
} = require('../helpers')
const {
  UpdateSyncQueueJobError
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

  async add (syncColls) {
    const _syncColls = Array.isArray(syncColls)
      ? syncColls
      : [syncColls]
    checkCollPermission(_syncColls, this.ALLOWED_COLLS)

    const allSyncs = await this._getAll(
      { state: [NEW_JOB_STATE, ERROR_JOB_STATE] }
    )
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
        state: NEW_JOB_STATE
      }
    })

    await this.dao.insertElemsToDb(
      this.name,
      null,
      data
    )
  }

  async process () {
    this._progress = this.syncInterrupter.INITIAL_PROGRESS

    let count = 0
    let multiplier = 0

    while (true) {
      if (this.syncInterrupter.hasInterrupted()) {
        break
      }

      count += 1

      const nextSync = await this._getNext()

      if (
        !nextSync ||
        typeof nextSync !== 'object' ||
        count > 100
      ) {
        break
      }

      const { _id } = nextSync

      await this._updateStateById(_id, LOCKED_JOB_STATE)
      multiplier = await this._subProcess(nextSync, multiplier)

      if (this.syncInterrupter.hasInterrupted()) {
        await this._updateStateById(_id, NEW_JOB_STATE)

        break
      }

      await this._updateStateById(_id, FINISHED_JOB_STATE)
    }

    await this._removeByState(FINISHED_JOB_STATE)

    if (!this.syncInterrupter.hasInterrupted()) {
      await this.setProgress(100)
    }

    return this._progress
  }

  async _subProcess (nextSync, multiplier) {
    const { _id, collName } = nextSync
    let currMultiplier = 0

    try {
      const dataInserter = this.dataInserterFactory(collName)

      dataInserter.addAsyncProgressHandler(async (progress) => {
        currMultiplier = await this._getMultiplier(collName)

        return this._asyncProgressHandler(
          multiplier + currMultiplier,
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

  async _getMultipliers () {
    const allSyncs = await this._getAll()

    if (
      !Array.isArray(allSyncs) ||
      allSyncs.length === 0
    ) {
      return {}
    }

    return allSyncs.reduce((accum, syncColls) => {
      const { collName } = { ...syncColls }

      if (!Number.isFinite(this.allMultipliers[collName])) {
        return accum
      }

      return {
        ...accum,
        [collName]: this.allMultipliers[collName]
      }
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

  async _getMultiplier (name) {
    const multipliers = await this._getMultipliers()
    const multipliersSum = this._sumMultipliers(multipliers)
    const currMultipliers = multipliers[name]

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

  _getAll (filter) {
    return this.dao.getElemsInCollBy(
      this.name,
      {
        sort: this._sort,
        filter
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

  _getNext () {
    const state = [NEW_JOB_STATE, ERROR_JOB_STATE]

    if (this._isFirstSync) {
      this._isFirstSync = false

      state.push(LOCKED_JOB_STATE)
    }

    return this.dao.getElemInCollBy(
      this.name,
      { state },
      this._sort
    )
  }

  _removeByState (state) {
    return this.dao.removeElemsFromDb(
      this.name,
      null,
      { state }
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

  async _asyncProgressHandler (multiplier, progress) {
    if (multiplier === 0 || progress === 0) {
      return
    }

    const currProgress = Math.round(progress * multiplier)

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
