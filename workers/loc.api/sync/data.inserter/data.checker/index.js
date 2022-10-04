'use strict'

const { isEmpty } = require('lodash')
const moment = require('moment')

const {
  SyncQueueIDSettingError
} = require('../../../errors')
const {
  isInsertableArrObjTypeOfColl
} = require('../../schema/utils')
const {
  filterMethodCollMap
} = require('./helpers')
const {
  CONVERT_TO,
  CANDLES_TIMEFRAME
} = require('../const')

const { decorateInjectable } = require('../../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.SyncSchema,
  TYPES.TABLES_NAMES,
  TYPES.ALLOWED_COLLS,
  TYPES.FOREX_SYMBS,
  TYPES.CurrencyConverter,
  TYPES.SyncInterrupter,
  TYPES.SyncCollsManager,
  TYPES.SyncUserStepManager,
  TYPES.SyncUserStepDataFactory
]
class DataChecker {
  constructor (
    dao,
    syncSchema,
    TABLES_NAMES,
    ALLOWED_COLLS,
    FOREX_SYMBS,
    currencyConverter,
    syncInterrupter,
    syncCollsManager,
    syncUserStepManager,
    syncUserStepDataFactory
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
    this.TABLES_NAMES = TABLES_NAMES
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.FOREX_SYMBS = FOREX_SYMBS
    this.currencyConverter = currencyConverter
    this.syncInterrupter = syncInterrupter
    this.syncCollsManager = syncCollsManager // TODO:
    this.syncUserStepManager = syncUserStepManager
    this.syncUserStepDataFactory = syncUserStepDataFactory

    this._methodCollMap = new Map()

    this._isInterrupted = this.syncInterrupter.hasInterrupted()
  }

  init (params = {}) {
    this.syncInterrupter.onceInterrupt(() => {
      this._isInterrupted = true
    })

    const {
      syncQueueId,
      methodCollMap
    } = params ?? {}

    if (!Number.isInteger(syncQueueId)) {
      throw new SyncQueueIDSettingError()
    }

    this.syncQueueId = syncQueueId
    this.setMethodCollMap(methodCollMap)

    this.syncUserStepManager.init({ syncQueueId: this.syncQueueId })
  }

  async checkNewData (auth) {
    const methodCollMap = this.getMethodCollMap()

    if (this._isInterrupted) {
      return filterMethodCollMap(methodCollMap)
    }

    await this._checkNewDataArrObjType(auth, methodCollMap)

    return filterMethodCollMap(methodCollMap)
  }

  async checkNewPublicData () {
    const methodCollMap = this.getMethodCollMap()

    if (this._isInterrupted) {
      return filterMethodCollMap(methodCollMap, true)
    }

    await this._checkNewDataPublicArrObjType(methodCollMap)

    return filterMethodCollMap(methodCollMap, true)
  }

  async _checkNewDataArrObjType (auth, methodCollMap) {
    for (const [method, item] of methodCollMap) {
      if (this._isInterrupted) {
        return
      }
      if (!isInsertableArrObjTypeOfColl(item)) {
        continue
      }

      await this._checkItemNewDataArrObjType(
        method,
        item,
        auth
      )
    }
  }

  // TODO:
  async _checkItemNewDataArrObjType (
    method,
    schema,
    auth
  ) {
    if (this._isInterrupted) {
      return
    }

    const { _id: userId, subUser } = auth ?? {}
    const { _id: subUserId } = subUser ?? {}

    this._resetSyncSchemaProps(schema)

    const currMts = Date.now()
    const {
      syncUserStepData,
      lastElemMtsFromTables
    } = await this.syncUserStepManager.getLastSyncedInfoForCurrColl(
      schema,
      {
        collName: method,
        userId,
        subUserId
      }
    )

    if (
      !syncUserStepData.isBaseStepReady ||
      !syncUserStepData.isCurrStepReady
    ) {
      schema.hasNewData = true
      schema.start.push(syncUserStepData)
    }

    const shouldFreshSyncBeAdded = this._shouldFreshSyncBeAdded(
      syncUserStepData,
      currMts
    )

    if (!shouldFreshSyncBeAdded) {
      return
    }

    const freshSyncUserStepData = this.syncUserStepDataFactory({
      currStart: lastElemMtsFromTables,
      currEnd: currMts,
      isCurrStepReady: false
    })
    schema.hasNewData = true
    schema.start.push(freshSyncUserStepData)
  }

  async _checkNewDataPublicArrObjType (methodCollMap) {
    for (const [method, schema] of methodCollMap) {
      if (this._isInterrupted) {
        return
      }
      if (!isInsertableArrObjTypeOfColl(schema, true)) {
        continue
      }
      if (
        schema.name === this.ALLOWED_COLLS.PUBLIC_TRADES ||
        schema.name === this.ALLOWED_COLLS.TICKERS_HISTORY
      ) {
        await this._checkNewConfigurablePublicData(method, schema)

        continue
      }
      if (schema.name === this.ALLOWED_COLLS.CANDLES) {
        if (!schema.isSyncDoneForCurrencyConv) {
          await this.checkNewCandlesData(method, schema)

          schema.isSyncDoneForCurrencyConv = true
        }

        await this._checkNewConfigurablePublicData(method, schema)

        continue
      }
    }
  }

  // TODO:
  async _checkNewConfigurablePublicData (method, schema) {
    if (this._isInterrupted) {
      return
    }

    this._resetSyncSchemaProps(schema)

    const currMts = Date.now()
    const {
      confName,
      timeframeFieldName
    } = schema ?? {}
    const groupResBy = (
      timeframeFieldName &&
      typeof timeframeFieldName === 'string'
    )
      ? ['symbol', 'timeframe']
      : ['symbol']

    const publicСollsСonf = await this.dao.getElemsInCollBy(
      this.TABLES_NAMES.PUBLIC_COLLS_CONF,
      {
        filter: { confName },
        subQuery: { sort: [['start', 1]] },
        groupResBy,
        groupFns: ['min(start)']
      }
    )

    if (isEmpty(publicСollsСonf)) {
      return
    }

    for (const confs of publicСollsСonf) {
      if (this._isInterrupted) {
        return
      }

      const {
        symbol,
        timeframe,
        start
      } = confs ?? {}

      const {
        syncUserStepData,
        lastElemMtsFromTables
      } = await this.syncUserStepManager.getLastSyncedInfoForCurrColl(
        schema,
        {
          collName: method,
          symbol,
          timeframe,
          defaultStart: start
        }
      )

      if (
        !syncUserStepData.isBaseStepReady ||
        !syncUserStepData.isCurrStepReady
      ) {
        schema.hasNewData = true
        schema.start.push(syncUserStepData)
      }

      const wasStartPointChanged = this._wasStartPointChanged(
        syncUserStepData,
        start
      )
      const shouldFreshSyncBeAdded = this._shouldFreshSyncBeAdded(
        syncUserStepData,
        currMts
      )

      if (
        !wasStartPointChanged &&
        !shouldFreshSyncBeAdded
      ) {
        return
      }

      const freshSyncUserStepData = this.syncUserStepDataFactory({
        isBaseStepReady: true,
        isCurrStepReady: true
      })

      if (wasStartPointChanged) {
        freshSyncUserStepData.setParams({
          baseStart: start,
          baseEnd: syncUserStepData.baseStart,
          isBaseStepReady: false
        })
      }
      if (shouldFreshSyncBeAdded) {
        freshSyncUserStepData.setParams({
          currStart: lastElemMtsFromTables,
          currEnd: currMts,
          isCurrStepReady: false
        })
      }

      schema.hasNewData = true
      schema.start.push(freshSyncUserStepData)
    }
  }

  /*
   * TODO:
   * This step is used for the currency converter
   */
  async checkNewCandlesData (
    method,
    schema
  ) {
    if (this._isInterrupted) {
      return
    }

    this._resetSyncSchemaProps(schema)

    const currMts = Date.now()
    const firstElemLedgers = await this.dao.getElemInCollBy(
      this.ALLOWED_COLLS.LEDGERS,
      { $not: { currency: 'USD' } },
      [['mts', 1]]
    )

    if (!Number.isInteger(firstElemLedgers?.mts)) {
      return
    }

    const uniqueSymbsSet = await this._getUniqueSymbsFromLedgers()
    const candlesPairsSet = new Set()

    for (const symbol of uniqueSymbsSet) {
      const currency = typeof symbol === 'string'
        ? symbol.replace(/F0$/i, '')
        : symbol
      const separator = (
        typeof currency === 'string' &&
        currency.length > 3
      )
        ? ':'
        : ''

      if (currency) {
        candlesPairsSet.add(`t${currency}${separator}${CONVERT_TO}`)
      }
    }
    for (const forexSymbol of this.FOREX_SYMBS) {
      candlesPairsSet.add(`tBTC${forexSymbol}`)
    }

    if (candlesPairsSet.size === 0) {
      return
    }

    for (const symbol of candlesPairsSet) {
      if (this._isInterrupted) {
        return
      }

      const {
        syncUserStepData,
        lastElemMtsFromTables
      } = await this.syncUserStepManager.getLastSyncedInfoForCurrColl(
        schema,
        {
          collName: method,
          symbol,
          timeframe: CANDLES_TIMEFRAME,
          defaultStart: firstElemLedgers.mts
        }
      )

      if (
        !syncUserStepData.isBaseStepReady ||
        !syncUserStepData.isCurrStepReady
      ) {
        schema.hasNewData = true
        schema.start.push(syncUserStepData)
      }

      const wasStartPointChanged = this._wasStartPointChanged(
        syncUserStepData,
        firstElemLedgers.mts
      )
      const shouldFreshSyncBeAdded = this._shouldFreshSyncBeAdded(
        syncUserStepData,
        currMts
      )

      if (
        !wasStartPointChanged &&
        !shouldFreshSyncBeAdded
      ) {
        return
      }

      const freshSyncUserStepData = this.syncUserStepDataFactory({
        isBaseStepReady: true,
        isCurrStepReady: true
      })

      if (wasStartPointChanged) {
        freshSyncUserStepData.setParams({
          baseStart: firstElemLedgers.mts,
          baseEnd: syncUserStepData.baseStart,
          isBaseStepReady: false
        })
      }
      if (shouldFreshSyncBeAdded) {
        freshSyncUserStepData.setParams({
          currStart: lastElemMtsFromTables,
          currEnd: currMts,
          isCurrStepReady: false
        })
      }

      schema.hasNewData = true
      schema.start.push(freshSyncUserStepData)
    }
  }

  getMethodCollMap () {
    return new Map(this._methodCollMap)
  }

  setMethodCollMap (methodCollMap) {
    this._methodCollMap = this.syncSchema
      .getMethodCollMap(methodCollMap)
  }

  _resetSyncSchemaProps (schema) {
    schema.hasNewData = false
    schema.start = []
  }

  _shouldFreshSyncBeAdded (
    syncUserStepData,
    currMts = Date.now(),
    allowedDiff
  ) {
    const {
      measure = 'minutes',
      allowedTimeDiff = 60
    } = allowedDiff ?? {}

    const baseEnd = (
      !syncUserStepData.isBaseStepReady &&
      syncUserStepData.hasBaseStep
    )
      ? syncUserStepData.baseEnd
      : 0
    const currEnd = (
      !syncUserStepData.isCurrStepReady &&
      syncUserStepData.hasCurrStep
    )
      ? syncUserStepData.currEnd
      : 0

    const momentBaseEnd = moment.utc(baseEnd)
    const momentCurrEnd = moment.utc(currEnd)
    const momentCurrMts = moment.utc(currMts)

    const momentMaxEnd = moment.max(momentBaseEnd, momentCurrEnd)
    const momentDiff = momentCurrMts.diff(momentMaxEnd, measure)

    return momentDiff > allowedTimeDiff
  }

  _wasStartPointChanged (
    syncUserStepData,
    startMts = 0,
    allowedDiff
  ) {
    const {
      measure = 'minutes',
      allowedTimeDiff = 5
    } = allowedDiff ?? {}

    const baseStart = (
      syncUserStepData.isBaseStepReady &&
      syncUserStepData.hasBaseStep
    )
      ? syncUserStepData.baseStart
      : 0

    const momentBaseStart = moment.utc(baseStart)
    const momentStartMts = moment.utc(startMts)

    const momentDiff = momentBaseStart.diff(momentStartMts, measure)

    return momentDiff > allowedTimeDiff
  }

  async _getUniqueSymbsFromLedgers () {
    const uniqueLedgersSymbsPromise = this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.LEDGERS,
      {
        filter: { $not: { currency: this.FOREX_SYMBS } },
        isDistinct: true,
        projection: ['currency']
      }
    )
    const currenciesSynonymousPromise = await this.currencyConverter
      .getCurrenciesSynonymous()

    const [
      uniqueLedgersSymbs,
      currenciesSynonymous
    ] = await Promise.all([
      uniqueLedgersSymbsPromise,
      currenciesSynonymousPromise
    ])

    const uniqueSymbs = uniqueLedgersSymbs.reduce((accum, ledger) => {
      const { currency } = ledger ?? {}

      if (!currency) {
        return accum
      }

      accum.add(currency)

      const synonymous = currenciesSynonymous.get(currency)

      if (!synonymous) {
        return accum
      }

      const uniqueSynonymous = synonymous
        .filter(([syn]) => !accum.has(syn))
        .map(([syn]) => syn)

      if (uniqueSynonymous.length > 0) {
        accum.add(...uniqueSynonymous)
      }

      return accum
    }, new Set())

    return uniqueSymbs
  }
}

decorateInjectable(DataChecker, depsTypes)

module.exports = DataChecker
