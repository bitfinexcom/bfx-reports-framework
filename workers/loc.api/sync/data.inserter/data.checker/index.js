'use strict'

const {
  isEmpty
} = require('lodash')
const moment = require('moment')
const {
  getDataFromApi
} = require('bfx-report/workers/loc.api/helpers')
const {
  FindMethodError
} = require('bfx-report/workers/loc.api/errors')

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
  TYPES.SyncCollsManager
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
    syncCollsManager
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

    this._methodCollMap = new Map()

    this._isInterrupted = this.syncInterrupter.hasInterrupted()
  }

  init ({ methodCollMap }) {
    this.syncInterrupter.onceInterrupt(() => {
      this._isInterrupted = true
    })

    this.setMethodCollMap(methodCollMap)
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

  async _checkItemNewDataArrObjType (
    method,
    schema,
    auth
  ) {
    if (this._isInterrupted) {
      return
    }

    this._resetSyncSchemaProps(schema)

    const args = this._getMethodArgMap(method, { auth, limit: 1 })
    args.params.notThrowError = true
    args.params.notCheckNextPage = true

    const { _id, subUser } = { ...auth }
    const { _id: subUserId } = { ...subUser }
    const hasSubUserIdField = (
      schema.model &&
      typeof schema.model === 'object' &&
      typeof schema.model.subUserId === 'string' &&
      Number.isInteger(subUserId)
    )
    const subUserIdFilter = hasSubUserIdField
      ? { $eq: { subUserId } }
      : {}
    const lastElemFromDb = await this.dao.getElemInCollBy(
      schema.name,
      {
        user_id: _id,
        ...subUserIdFilter
      },
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
      {
        user_id: _id,
        ...subUserIdFilter
      },
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
        method,
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

      accum.push(currency)

      const synonymous = currenciesSynonymous.get(currency)

      if (!synonymous) {
        return accum
      }

      const uniqueSynonymous = synonymous
        .filter(([syn]) => (
          accum.every((symb) => symb !== syn)
        ))
        .map(([syn]) => syn)

      accum.push(...uniqueSynonymous)

      return accum
    }, [])

    const _collСonfig = uniqueSymbs.map((currency) => {
      const _currency = typeof currency === 'string'
        ? currency.replace(/F0$/i, '')
        : currency
      const separator = (
        typeof _currency === 'string' &&
        _currency.length > 3
      )
        ? ':'
        : ''

      return {
        symbol: `t${_currency}${separator}${CONVERT_TO}`,
        start: lastElemLedgers.mts
      }
    })
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
      const _argsForLastElem = this._getMethodArgMap(method, {}, 1)
      const argsForLastElem = {
        ..._argsForLastElem,
        params: {
          ..._argsForLastElem.params,
          ...params
        }
      }
      const _argsForReceivingStart = this._getMethodArgMap(
        method,
        { limit: 1, end: _start }
      )
      const argsForReceivingStart = {
        ..._argsForReceivingStart,
        params: {
          ..._argsForReceivingStart.params,
          ...params
        }
      }

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
    return getMethodArgMap(
      this._methodCollMap.get(method),
      opts
    )
  }

  _getDataFromApi (methodApi, args) {
    if (typeof this.rService[methodApi] !== 'function') {
      throw new FindMethodError()
    }

    return getDataFromApi(
      (space, args) => this.rService[methodApi]
        .bind(this.rService)(args),
      args,
      null,
      null,
      this.syncInterrupter
    )
  }
}

decorateInjectable(DataChecker, depsTypes)

module.exports = DataChecker
