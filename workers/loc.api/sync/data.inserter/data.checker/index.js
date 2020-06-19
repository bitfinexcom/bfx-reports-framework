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
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../../di/types')
const {
  isInsertableArrObjTypeOfColl,
  getMethodArgMap
} = require('../helpers')
const {
  filterMethodCollMap,
  pushConfigurablePublicDataStartConf,
  invertSort,
  compareElemsDbAndApi
} = require('./helpers')

class DataChecker {
  constructor (
    rService,
    dao,
    syncSchema,
    TABLES_NAMES,
    ALLOWED_COLLS,
    FOREX_SYMBS,
    currencyConverter
  ) {
    this.rService = rService
    this.dao = dao
    this.syncSchema = syncSchema
    this.TABLES_NAMES = TABLES_NAMES
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.FOREX_SYMBS = FOREX_SYMBS
    this.currencyConverter = currencyConverter

    this._methodCollMap = new Map()

    this.convertTo = null
    this.candlesTimeframe = null
    this.candlesSection = null
  }

  init ({
    methodCollMap,
    convertTo,
    candlesTimeframe,
    candlesSection
  }) {
    this._methodCollMap = this.syncSchema
      .getMethodCollMap(methodCollMap)
    this.convertTo = convertTo
    this.candlesTimeframe = candlesTimeframe
    this.candlesSection = candlesSection
  }

  async checkNewData (auth) {
    const methodCollMap = this._getMethodCollMap()

    await this._checkNewDataArrObjType(auth, methodCollMap)

    return filterMethodCollMap(methodCollMap)
  }

  async checkNewPublicData () {
    const methodCollMap = this._getMethodCollMap()

    await this._checkNewDataPublicArrObjType(methodCollMap)

    return filterMethodCollMap(methodCollMap, true)
  }

  async _checkNewDataArrObjType (auth, methodCollMap) {
    for (const [method, item] of methodCollMap) {
      if (!isInsertableArrObjTypeOfColl(item)) {
        continue
      }

      await this._checkItemNewDataArrObjType(
        method,
        item,
        auth
      )
    }

    return methodCollMap
  }

  async _checkItemNewDataArrObjType (
    method,
    schema,
    auth
  ) {
    schema.hasNewData = false

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
    const { res: lastElemFromApi } = await this._getDataFromApi(
      method,
      args,
      true
    )

    if (isEmpty(lastElemFromApi)) {
      return
    }

    if (isEmpty(lastElemFromDb)) {
      schema.hasNewData = true
      schema.start = 0
      return
    }

    const lastDateInDb = compareElemsDbAndApi(
      schema.dateFieldName,
      lastElemFromDb,
      lastElemFromApi
    )

    if (lastDateInDb) {
      schema.hasNewData = true
      schema.start = lastDateInDb + 1
    }
  }

  async _checkNewDataPublicArrObjType (methodCollMap) {
    for (const [method, schema] of methodCollMap) {
      if (!isInsertableArrObjTypeOfColl(schema, true)) {
        continue
      }
      if (
        schema.name === this.ALLOWED_COLLS.PUBLIC_TRADES ||
        schema.name === this.ALLOWED_COLLS.TICKERS_HISTORY
      ) {
        schema.hasNewData = false

        await this._checkNewConfigurablePublicData(method, schema)

        continue
      }
      if (schema.name === this.ALLOWED_COLLS.CANDLES) {
        schema.hasNewData = false

        await this._checkNewCandlesData(method, schema)
        await this._checkNewConfigurablePublicData(method, schema)

        continue
      }

      await this._checkItemNewDataArrObjType(method, schema)
    }
  }

  async _checkNewConfigurablePublicData (method, schema) {
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
        section: this.candlesSection,
        notThrowError: true,
        notCheckNextPage: true
      }
      : {
        notThrowError: true,
        notCheckNextPage: true
      }

    for (const confs of publicСollsСonf) {
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
      const { res: lastElemFromApi } = await this._getDataFromApi(
        method,
        args,
        true
      )

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
        pushConfigurablePublicDataStartConf(
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

      pushConfigurablePublicDataStartConf(
        schema,
        symbol,
        startConf,
        timeframe
      )
    }
  }

  async _checkNewCandlesData (
    method,
    schema
  ) {
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
        symbol: `t${_currency}${separator}${this.convertTo}`,
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
      const mtsMoment = moment.utc(configStart)
        .add(-1, 'days')
        .valueOf()
      const _start = configStart
        ? mtsMoment
        : configStart
      const params = {
        timeframe: this.candlesTimeframe,
        section: this.candlesSection,
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
        [timeframeFieldName]: this.candlesTimeframe
      }
      const lastElemFromDb = await this.dao.getElemInCollBy(
        name,
        filter,
        sort
      )
      const {
        res: lastElemFromApi
      } = await this._getDataFromApi(method, argsForLastElem)
      const {
        res: startElemFromApi
      } = await this._getDataFromApi(method, argsForReceivingStart)

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
        pushConfigurablePublicDataStartConf(
          schema,
          symbol,
          { currStart: start },
          this.candlesTimeframe
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

      pushConfigurablePublicDataStartConf(
        schema,
        symbol,
        startConf,
        this.candlesTimeframe
      )
    }
  }

  _getMethodCollMap () {
    return new Map(this._methodCollMap)
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
      args
    )
  }
}

decorate(injectable(), DataChecker)
decorate(inject(TYPES.RService), DataChecker, 0)
decorate(inject(TYPES.DAO), DataChecker, 1)
decorate(inject(TYPES.SyncSchema), DataChecker, 2)
decorate(inject(TYPES.TABLES_NAMES), DataChecker, 3)
decorate(inject(TYPES.ALLOWED_COLLS), DataChecker, 4)
decorate(inject(TYPES.FOREX_SYMBS), DataChecker, 5)
decorate(inject(TYPES.CurrencyConverter), DataChecker, 6)

module.exports = DataChecker
