'use strict'

const { isEmpty, min } = require('lib-js-util-base')
const moment = require('moment')

const SyncTempTablesManager = require('../sync.temp.tables.manager')
const {
  SyncQueueIDSettingError
} = require('../../../errors')
const {
  isInsertableArrObj,
  isUpdatable,
  isPublic
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
    this._setMethodCollMap(methodCollMap)

    this.syncUserStepManager.init({ syncQueueId: this.syncQueueId })
  }

  async checkNewData (auth) {
    const methodCollMap = this._getMethodCollMap()

    if (this._isInterrupted) {
      return filterMethodCollMap(methodCollMap)
    }

    await this._checkNewDataArrObjType(auth, methodCollMap)

    return filterMethodCollMap(methodCollMap)
  }

  /*
   * `authMap` can be empty
   */
  async checkNewPublicData (authMap) {
    const methodCollMap = this._getMethodCollMap()

    if (this._isInterrupted) {
      return filterMethodCollMap(methodCollMap, true)
    }

    await this._checkNewDataPublicArrObjType(authMap, methodCollMap)
    await this._checkNewPublicUpdatableData(methodCollMap)

    return filterMethodCollMap(methodCollMap, true)
  }

  async _checkNewDataArrObjType (auth, methodCollMap) {
    for (const [method, schema] of methodCollMap) {
      if (this._isInterrupted) {
        return
      }
      if (!isInsertableArrObj(schema?.type, { isPrivate: true })) {
        continue
      }

      this._resetSyncSchemaProps(schema)

      await this._checkItemNewDataArrObjType(
        method,
        schema,
        auth
      )
    }
  }

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
      ...syncUserStepData.getParams(),
      currStart: lastElemMtsFromTables,
      currEnd: currMts,
      isCurrStepReady: false
    })
    schema.hasNewData = true
    schema.start.push(freshSyncUserStepData)
  }

  async _checkNewDataPublicArrObjType (authMap, methodCollMap) {
    for (const [method, schema] of methodCollMap) {
      if (this._isInterrupted) {
        return
      }
      if (!isInsertableArrObj(schema?.type, { isPublic: true })) {
        continue
      }

      this._resetSyncSchemaProps(schema)

      if (schema.name === this.ALLOWED_COLLS.CANDLES) {
        // If `authMap` is empty sync candles for all users
        const _authMap = (
          !(authMap instanceof Map) ||
          authMap.size === 0
        )
          ? new Map([['ALL', {}]])
          : authMap

        for (const authItem of _authMap) {
          await this._checkNewCandlesData(
            method,
            schema,
            authItem[1]
          )
        }
      }
      if (
        schema.name === this.ALLOWED_COLLS.PUBLIC_TRADES ||
        schema.name === this.ALLOWED_COLLS.TICKERS_HISTORY ||
        schema.name === this.ALLOWED_COLLS.CANDLES
      ) {
        await this._checkNewConfigurablePublicData(method, schema)

        continue
      }
    }
  }

  async _checkNewConfigurablePublicData (method, schema) {
    if (this._isInterrupted) {
      return
    }

    const currMts = Date.now()
    const type = schema.getModelField('TYPE')
    const confName = schema.getModelField('CONF_NAME')
    const timeframeFieldName = schema.getModelField('TIMEFRAME_FIELD_NAME')
    const groupResBy = (
      timeframeFieldName &&
      typeof timeframeFieldName === 'string'
    )
      ? ['symbol', 'timeframe']
      : ['symbol']

    const publicCollsConf = await this.dao.getElemsInCollBy(
      this.TABLES_NAMES.PUBLIC_COLLS_CONF,
      {
        filter: { confName },
        subQuery: { sort: [['start', 1]] },
        groupResBy,
        groupFns: ['min(start)']
      }
    )

    if (isEmpty(publicCollsConf)) {
      return
    }

    for (const confs of publicCollsConf) {
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
          defaultStart: start,
          currMts: isUpdatable(type)
            ? null
            : currMts
        }
      )

      if (
        !syncUserStepData.isBaseStepReady ||
        !syncUserStepData.isCurrStepReady
      ) {
        schema.setModelField('HAS_NEW_DATA', true)
        schema.getModelField('START').push(syncUserStepData)

        if (isUpdatable(type)) {
          continue
        }
      }

      if (isUpdatable(type)) {
        const freshSyncUserStepData = this.syncUserStepDataFactory({
          ...syncUserStepData.getParams(),
          currStart: start,
          isCurrStepReady: false
        })

        schema.setModelField('HAS_NEW_DATA', true)
        schema.getModelField('START').push(freshSyncUserStepData)

        continue
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
        continue
      }

      const freshSyncUserStepData = this.syncUserStepDataFactory({
        ...syncUserStepData.getParams(),
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

      schema.setModelField('HAS_NEW_DATA', true)
      schema.getModelField('START').push(freshSyncUserStepData)
    }
  }

  /*
   * This step is used for the currency converter
   */
  async _checkNewCandlesData (
    method,
    schema,
    auth
  ) {
    if (this._isInterrupted) {
      return
    }

    const { _id: userId, subUser } = auth ?? {}
    const { _id: subUserId } = subUser ?? {}
    const usersFilter = Number.isInteger(userId)
      ? { $eq: { user_id: userId } }
      : {}

    const currMts = Date.now()
    const firstLedgerMts = await this._getFirstLedgerMts(usersFilter)

    if (!Number.isInteger(firstLedgerMts)) {
      return
    }

    const uniqueSymbsSet = await this._getUniqueSymbsFromLedgers(
      usersFilter
    )
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
          defaultStart: firstLedgerMts,
          userId,
          subUserId
        }
      )

      if (
        !syncUserStepData.isBaseStepReady ||
        !syncUserStepData.isCurrStepReady
      ) {
        schema.setModelField('HAS_NEW_DATA', true)
      }

      const wasStartPointChanged = this._wasStartPointChanged(
        syncUserStepData,
        firstLedgerMts
      )
      const shouldFreshSyncBeAdded = this._shouldFreshSyncBeAdded(
        syncUserStepData,
        currMts,
        { dayOfYear: 1 }
      )

      if (wasStartPointChanged) {
        syncUserStepData.setParams({
          baseStart: firstLedgerMts,
          isBaseStepReady: false
        })

        schema.setModelField('HAS_NEW_DATA', true)
      }
      if (shouldFreshSyncBeAdded) {
        syncUserStepData.setParams({
          currStart: lastElemMtsFromTables,
          currEnd: currMts,
          isCurrStepReady: false
        })

        schema.setModelField('HAS_NEW_DATA', true)
      }

      if (!schema.getModelField('HAS_NEW_DATA')) {
        continue
      }

      // To keep flow: one candles request per currency
      if (!syncUserStepData.isBaseStepReady) {
        syncUserStepData.setParams({
          baseEnd: syncUserStepData.currEnd ?? currMts,
          isCurrStepReady: true
        })
      }

      syncUserStepData.auth = auth
      schema.getModelField('START').push(syncUserStepData)
    }
  }

  async _checkNewPublicUpdatableData (methodCollMap) {
    for (const [method, schema] of methodCollMap) {
      if (this._isInterrupted) {
        return
      }

      const type = schema.getModelField('TYPE')
      const name = schema.getModelField('TYPE')

      if (
        !isUpdatable(type) ||
        !isPublic(type)
      ) {
        continue
      }

      this._resetSyncSchemaProps(schema)

      const hasStatusMessagesSection = name === this.ALLOWED_COLLS.STATUS_MESSAGES

      if (hasStatusMessagesSection) {
        await this._checkNewConfigurablePublicData(method, schema)

        continue
      }

      const {
        syncUserStepData
      } = await this.syncUserStepManager.getLastSyncedInfoForCurrColl(
        schema,
        {
          collName: method,
          defaultStart: null,
          currMts: null
        }
      )

      if (
        !syncUserStepData.isBaseStepReady ||
        !syncUserStepData.isCurrStepReady
      ) {
        schema.setModelField('HAS_NEW_DATA', true)
        schema.getModelField('START').push(syncUserStepData)

        continue
      }

      const freshSyncUserStepData = this.syncUserStepDataFactory({
        ...syncUserStepData.getParams(),
        isCurrStepReady: false
      })
      schema.setModelField('HAS_NEW_DATA', true)
      schema.getModelField('START').push(freshSyncUserStepData)
    }
  }

  _shouldFreshSyncBeAdded (
    syncUserStepData,
    currMts = Date.now(),
    allowedDiff
  ) {
    const {
      measure = 'minutes',
      allowedTimeDiff = 60,
      dayOfYear
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
    const syncedAt = syncUserStepData.hasSyncedAt
      ? syncUserStepData.syncedAt
      : 0

    const momentBaseEnd = moment.utc(baseEnd)
    const momentCurrEnd = moment.utc(currEnd)
    const momentCurrMts = moment.utc(currMts)
    const momentSyncedAt = moment.utc(syncedAt)

    const momentMaxEnd = moment.max(momentBaseEnd, momentCurrEnd)
    const momentDiff = momentCurrMts.diff(momentMaxEnd, measure)
    const yearsDiff = momentCurrMts.year() - momentSyncedAt.year()
    const dayOfYearDiff = momentCurrMts.dayOfYear() - momentSyncedAt.dayOfYear()

    return (
      momentDiff > allowedTimeDiff &&
      (
        !Number.isFinite(dayOfYear) ||
        yearsDiff >= 1 ||
        dayOfYearDiff >= dayOfYear
      )
    )
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

  async _getFirstLedgerMts (usersFilter) {
    const firstElemFilter = {
      ...usersFilter,
      $not: { currency: 'USD' }
    }
    const firstElemOrder = [['mts', 1]]

    const tempLedgersTableName = SyncTempTablesManager.getTempTableName(
      this.ALLOWED_COLLS.LEDGERS,
      this.syncQueueId
    )
    const hasTempTable = await this.dao.hasTable(tempLedgersTableName)

    const firstMainElemLedgersPromise = this.dao.getElemInCollBy(
      this.ALLOWED_COLLS.LEDGERS,
      firstElemFilter,
      firstElemOrder
    )
    const firstTempElemLedgersPromise = hasTempTable
      ? this.dao.getElemInCollBy(
        tempLedgersTableName,
        firstElemFilter,
        firstElemOrder
      )
      : null

    const [
      firstMainElemLedgers,
      firstTempElemLedgers
    ] = await Promise.all([
      firstMainElemLedgersPromise,
      firstTempElemLedgersPromise
    ])

    const firstElemMts = min([
      firstMainElemLedgers?.mts,
      firstTempElemLedgers?.mts
    ])

    /*
     * To convert the first ledgers to USD
     * it needs to provide some overlap of candles
     */
    const mts = moment.utc(firstElemMts)
      .add(-5, 'days')
      .valueOf()

    return mts
  }

  async _getUniqueSymbsFromLedgers (usersFilter) {
    const ledgerParams = {
      filter: {
        ...usersFilter,
        $not: { currency: this.FOREX_SYMBS }
      },
      isDistinct: true,
      projection: ['currency']
    }

    const tempLedgersTableName = SyncTempTablesManager.getTempTableName(
      this.ALLOWED_COLLS.LEDGERS,
      this.syncQueueId
    )
    const hasTempTable = await this.dao.hasTable(tempLedgersTableName)

    const uniqueMainLedgersSymbsPromise = this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.LEDGERS,
      ledgerParams
    )
    const uniqueTempLedgersSymbsPromise = hasTempTable
      ? this.dao.getElemsInCollBy(
        tempLedgersTableName,
        ledgerParams
      )
      : []
    const currenciesSynonymousPromise = await this.currencyConverter
      .getCurrenciesSynonymous()

    const [
      uniqueMainLedgersSymbs,
      uniqueTempLedgersSymbs,
      currenciesSynonymous
    ] = await Promise.all([
      uniqueMainLedgersSymbsPromise,
      uniqueTempLedgersSymbsPromise,
      currenciesSynonymousPromise
    ])
    const ledgers = [
      ...uniqueMainLedgersSymbs,
      ...uniqueTempLedgersSymbs
    ]

    const uniqueSymbs = ledgers.reduce((accum, ledger) => {
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

  _resetSyncSchemaProps (schema) {
    schema
      .setModelField('HAS_NEW_DATA', false)
      .setModelField('START', [])
  }

  _getMethodCollMap () {
    return this.syncSchema
      .getClonedMethodCollMap(this._methodCollMap)
  }

  _setMethodCollMap (methodCollMap) {
    this._methodCollMap = this.syncSchema
      .getClonedMethodCollMap(methodCollMap)
  }
}

decorateInjectable(DataChecker, depsTypes)

module.exports = DataChecker
