'use strict'

const {
  isEmpty
} = require('lodash')
const moment = require('moment')
const {
  FindMethodError
} = require('bfx-report/workers/loc.api/errors')

const {
  SyncQueueIDSettingError
} = require('../../../errors')
const {
  getMethodArgMap
} = require('../helpers')
const {
  isInsertableArrObjTypeOfColl
} = require('../../schema/utils')
const {
  filterMethodCollMap,
  pushConfigurableDataStartConf,
  invertSort,
  compareElemsDbAndApi
} = require('./helpers')
const {
  CONVERT_TO,
  CANDLES_TIMEFRAME,
  CANDLES_SECTION,
  ALL_SYMBOLS_TO_SYNC
} = require('../const')

const { decorateInjectable } = require('../../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.RService,
  TYPES.DAO,
  TYPES.SyncSchema,
  TYPES.TABLES_NAMES,
  TYPES.ALLOWED_COLLS,
  TYPES.FOREX_SYMBS,
  TYPES.CurrencyConverter,
  TYPES.SyncInterrupter,
  TYPES.SyncCollsManager,
  TYPES.GetDataFromApi,
  TYPES.SyncUserStepManager,
  TYPES.SyncUserStepDataFactory
]
class DataChecker {
  constructor (
    rService,
    dao,
    syncSchema,
    TABLES_NAMES,
    ALLOWED_COLLS,
    FOREX_SYMBS,
    currencyConverter,
    syncInterrupter,
    syncCollsManager,
    getDataFromApi,
    syncUserStepManager,
    syncUserStepDataFactory
  ) {
    this.rService = rService
    this.dao = dao
    this.syncSchema = syncSchema
    this.TABLES_NAMES = TABLES_NAMES
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.FOREX_SYMBS = FOREX_SYMBS
    this.currencyConverter = currencyConverter
    this.syncInterrupter = syncInterrupter
    this.syncCollsManager = syncCollsManager
    this.getDataFromApi = getDataFromApi
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

  // TODO: need to remove `NewWay` from end of method name
  async _checkItemNewDataArrObjTypeNewWay (
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

  /**
   * TODO:
   * @deprecated
   */
  async _checkItemNewDataArrObjType (
    method,
    schema,
    auth
  ) {
    if (this._isInterrupted) {
      return
    }

    this._resetSyncSchemaProps(schema)

    const args = this._getMethodArgMap(schema, { auth, limit: 1 })
    args.params.notThrowError = true
    args.params.notCheckNextPage = true

    const { _id, subUser } = { ...auth }
    const { _id: subUserId } = { ...subUser }
    const hasSubUserIdField = (
      typeof schema?.model?.subUserId === 'string' &&
      Number.isInteger(subUserId)
    )
    const userIdFilter = hasSubUserIdField
      ? { $eq: { user_id: _id, subUserId } }
      : { $eq: { user_id: _id } }
    const lastElemFromDb = await this.dao.getElemInCollBy(
      schema.name,
      userIdFilter,
      schema.sort
    )
    const {
      res: lastElemFromApi,
      isInterrupted
    } = await this._getDataFromApi(
      method,
      args,
      true
    )

    if (
      isInterrupted ||
      isEmpty(lastElemFromApi)
    ) {
      return
    }

    if (isEmpty(lastElemFromDb)) {
      schema.hasNewData = true
      pushConfigurableDataStartConf(
        schema,
        ALL_SYMBOLS_TO_SYNC,
        {
          baseStartFrom: 0,
          baseStartTo: Date.now()
        }
      )
      return
    }

    const lastDateInDb = compareElemsDbAndApi(
      schema.dateFieldName,
      lastElemFromDb,
      lastElemFromApi
    )

    const startConf = {
      baseStartFrom: 0,
      baseStartTo: null,
      currStart: null
    }

    if (lastDateInDb) {
      schema.hasNewData = true
      startConf.currStart = lastDateInDb + 1
    }

    const hasCollBeenSyncedAtLeastOnce = await this.syncCollsManager
      .hasCollBeenSyncedAtLeastOnce({
        userId: _id,
        subUserId,
        collName: method
      })

    if (hasCollBeenSyncedAtLeastOnce) {
      pushConfigurableDataStartConf(
        schema,
        ALL_SYMBOLS_TO_SYNC,
        startConf
      )

      if (!schema.hasNewData) {
        await this.syncCollsManager.setCollAsSynced({
          collName: method, userId: _id, subUserId
        })
      }

      return
    }

    const firstElemFromDb = await this.dao.getElemInCollBy(
      schema.name,
      userIdFilter,
      invertSort(schema.sort)
    )

    if (isEmpty(firstElemFromDb)) {
      return
    }

    schema.hasNewData = true
    startConf.baseStartTo = firstElemFromDb[schema.dateFieldName]

    pushConfigurableDataStartConf(
      schema,
      ALL_SYMBOLS_TO_SYNC,
      startConf
    )
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

  // TODO: need to remove `NewWay` from end of method name
  async _checkNewConfigurablePublicDataNewWay (method, schema) {
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

  /**
   * TODO:
   * @deprecated
   */
  async _checkNewConfigurablePublicData (method, schema) {
    if (this._isInterrupted) {
      return
    }

    this._resetSyncSchemaProps(schema)

    const {
      confName,
      symbolFieldName,
      timeframeFieldName,
      dateFieldName,
      name,
      sort
    } = { ...schema }
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
        groupResBy
      }
    )

    if (isEmpty(publicСollsСonf)) {
      return
    }

    const params = name === this.ALLOWED_COLLS.CANDLES
      ? {
          section: CANDLES_SECTION,
          notThrowError: true,
          notCheckNextPage: true
        }
      : {
          notThrowError: true,
          notCheckNextPage: true
        }

    for (const confs of publicСollsСonf) {
      if (this._isInterrupted) {
        return
      }

      const {
        symbol,
        start,
        timeframe
      } = confs
      const timeframeParam = (
        timeframe &&
        typeof timeframe === 'string'
      )
        ? { timeframe }
        : {}
      const args = this._getMethodArgMap(
        schema,
        {
          limit: 1,
          params: {
            ...params,
            ...timeframeParam,
            symbol
          }
        }
      )
      const timeframeFilter = (
        timeframe &&
        typeof timeframe === 'string' &&
        timeframeFieldName &&
        typeof timeframeFieldName === 'string'
      )
        ? { [timeframeFieldName]: timeframe }
        : {}
      const filter = {
        ...timeframeFilter,
        [symbolFieldName]: symbol
      }
      const lastElemFromDb = await this.dao.getElemInCollBy(
        name,
        filter,
        sort
      )
      const {
        res: lastElemFromApi,
        isInterrupted
      } = await this._getDataFromApi(
        method,
        args,
        true
      )

      if (isInterrupted) {
        return
      }
      if (
        isEmpty(lastElemFromApi) ||
        (
          Array.isArray(lastElemFromApi) &&
          lastElemFromApi[0][symbolFieldName] &&
          typeof lastElemFromApi[0][symbolFieldName] === 'string' &&
          lastElemFromApi[0][symbolFieldName] !== symbol
        )
      ) {
        continue
      }
      if (isEmpty(lastElemFromDb)) {
        schema.hasNewData = true
        pushConfigurableDataStartConf(
          schema,
          symbol,
          { currStart: start },
          timeframe
        )

        continue
      }

      const lastDateInDb = compareElemsDbAndApi(
        dateFieldName,
        lastElemFromDb,
        lastElemFromApi
      )

      const startConf = {
        baseStartFrom: null,
        baseStartTo: null,
        currStart: null
      }

      if (lastDateInDb) {
        schema.hasNewData = true
        startConf.currStart = lastDateInDb + 1
      }

      const firstElemFromDb = await this.dao.getElemInCollBy(
        name,
        filter,
        invertSort(sort)
      )

      if (!isEmpty(firstElemFromDb)) {
        const isChangedBaseStart = compareElemsDbAndApi(
          dateFieldName,
          { [dateFieldName]: start },
          firstElemFromDb
        )

        if (isChangedBaseStart) {
          schema.hasNewData = true
          startConf.baseStartFrom = start
          startConf.baseStartTo = firstElemFromDb[dateFieldName] - 1
        }
      }

      pushConfigurableDataStartConf(
        schema,
        symbol,
        startConf,
        timeframe
      )
    }

    if (schema.hasNewData) {
      return
    }

    const hasCollBeenSyncedAtLeastOnce = await this.syncCollsManager
      .hasCollBeenSyncedAtLeastOnce({ collName: method })

    if (!hasCollBeenSyncedAtLeastOnce) {
      return
    }

    await this.syncCollsManager.setCollAsSynced({
      collName: method
    })
  }

  /*
   * TODO: need to remove `NewWay` from end of method name
   * This step is used for the currency converter
   */
  async checkNewCandlesDataNewWay (
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

  /**
   * TODO:
   * @deprecated
   */
  async checkNewCandlesData (
    method,
    schema
  ) {
    if (this._isInterrupted) {
      return
    }

    this._resetSyncSchemaProps(schema)

    const {
      symbolFieldName,
      timeframeFieldName,
      dateFieldName,
      name,
      sort
    } = { ...schema }

    const lastElemLedgers = await this.dao.getElemInCollBy(
      this.ALLOWED_COLLS.LEDGERS,
      { $not: { currency: this.FOREX_SYMBS } },
      [['mts', 1]]
    )

    if (
      !lastElemLedgers ||
      typeof lastElemLedgers !== 'object' ||
      !Number.isInteger(lastElemLedgers.mts)
    ) {
      return
    }

    const uniqueLedgersSymbs = await this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.LEDGERS,
      {
        filter: { $not: { currency: this.FOREX_SYMBS } },
        isDistinct: true,
        projection: ['currency']
      }
    )

    if (
      !Array.isArray(uniqueLedgersSymbs) ||
      uniqueLedgersSymbs.length === 0
    ) {
      return
    }

    const currenciesSynonymous = await this.currencyConverter
      .getCurrenciesSynonymous()

    const uniqueSymbs = uniqueLedgersSymbs.reduce((accum, ledger) => {
      const { currency } = { ...ledger }

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

    const _collСonfig = []

    for (const currency of uniqueSymbs) {
      const _currency = typeof currency === 'string'
        ? currency.replace(/F0$/i, '')
        : currency
      const separator = (
        typeof _currency === 'string' &&
        _currency.length > 3
      )
        ? ':'
        : ''

      _collСonfig.push({
        symbol: `t${_currency}${separator}${CONVERT_TO}`,
        start: lastElemLedgers.mts
      })
    }

    const collСonfig = this.FOREX_SYMBS.reduce((accum, convertTo) => {
      const _symb = `tBTC${convertTo}`

      if (accum.every(({ symbol }) => symbol !== _symb)) {
        accum.push({
          symbol: _symb,
          start: lastElemLedgers.mts
        })
      }

      return accum
    }, _collСonfig)

    for (const { symbol, start: configStart } of collСonfig) {
      if (this._isInterrupted) {
        return
      }

      const mtsMoment = moment.utc(configStart)
        .add(-1, 'days')
        .valueOf()
      const _start = configStart
        ? mtsMoment
        : configStart
      const params = {
        timeframe: CANDLES_TIMEFRAME,
        section: CANDLES_SECTION,
        notThrowError: true,
        notCheckNextPage: true,
        symbol
      }
      const argsForLastElem = this._getMethodArgMap(
        schema,
        { limit: 1, params }
      )
      const argsForReceivingStart = this._getMethodArgMap(
        schema,
        { limit: 1, end: _start, params }
      )

      const filter = {
        [symbolFieldName]: symbol,
        [timeframeFieldName]: CANDLES_TIMEFRAME
      }
      const lastElemFromDb = await this.dao.getElemInCollBy(
        name,
        filter,
        sort
      )
      const {
        res: lastElemFromApi,
        isInterrupted: isInterruptedForLast
      } = await this._getDataFromApi(method, argsForLastElem)

      if (isInterruptedForLast) {
        return
      }

      const {
        res: startElemFromApi,
        isInterrupted: isInterruptedForStart
      } = await this._getDataFromApi(method, argsForReceivingStart)

      if (isInterruptedForStart) {
        return
      }
      if (
        isEmpty(lastElemFromApi) ||
        (
          Array.isArray(lastElemFromApi) &&
          lastElemFromApi[0][symbolFieldName] &&
          typeof lastElemFromApi[0][symbolFieldName] === 'string' &&
          lastElemFromApi[0][symbolFieldName] !== symbol
        )
      ) {
        continue
      }

      const start = (
        Array.isArray(startElemFromApi) &&
        startElemFromApi[startElemFromApi.length - 1] &&
        typeof startElemFromApi[startElemFromApi.length - 1] === 'object' &&
        Number.isInteger(
          startElemFromApi[startElemFromApi.length - 1][dateFieldName]
        )
      )
        ? startElemFromApi[startElemFromApi.length - 1][dateFieldName]
        : _start

      if (isEmpty(lastElemFromDb)) {
        schema.hasNewData = true
        pushConfigurableDataStartConf(
          schema,
          symbol,
          { currStart: start },
          CANDLES_TIMEFRAME
        )

        continue
      }

      const lastDateInDb = compareElemsDbAndApi(
        dateFieldName,
        lastElemFromDb,
        lastElemFromApi
      )

      const startConf = {
        baseStartFrom: null,
        baseStartTo: null,
        currStart: null
      }

      if (lastDateInDb) {
        schema.hasNewData = true
        startConf.currStart = lastDateInDb + 1
      }

      const firstElemFromDb = await this.dao.getElemInCollBy(
        name,
        filter,
        invertSort(sort)
      )

      if (!isEmpty(firstElemFromDb)) {
        const isChangedBaseStart = compareElemsDbAndApi(
          dateFieldName,
          { [dateFieldName]: start },
          firstElemFromDb
        )

        if (isChangedBaseStart) {
          schema.hasNewData = true
          startConf.baseStartFrom = start
          startConf.baseStartTo = firstElemFromDb[dateFieldName] - 1
        }
      }

      pushConfigurableDataStartConf(
        schema,
        symbol,
        startConf,
        CANDLES_TIMEFRAME
      )
    }

    if (schema.hasNewData) {
      return
    }

    const hasCollBeenSyncedAtLeastOnce = await this.syncCollsManager
      .hasCollBeenSyncedAtLeastOnce({ collName: method })

    if (!hasCollBeenSyncedAtLeastOnce) {
      return
    }

    await this.syncCollsManager.setCollAsSynced({
      collName: method
    })
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

  _getMethodArgMap (method, opts) {
    const schema = typeof method === 'string'
      ? this._methodCollMap.get(method)
      : method

    return getMethodArgMap(schema, opts)
  }

  _getDataFromApi (methodApi, args) {
    if (typeof this.rService[methodApi] !== 'function') {
      throw new FindMethodError()
    }

    return this.getDataFromApi({
      getData: (space, args) => this.rService[methodApi]
        .bind(this.rService)(args),
      args,
      callerName: 'DATA_SYNCER'
    })
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
