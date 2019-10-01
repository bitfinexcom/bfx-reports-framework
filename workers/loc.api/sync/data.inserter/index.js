'use strict'

const EventEmitter = require('events')
const moment = require('moment')
const {
  isEmpty,
  cloneDeep
} = require('lodash')
const {
  isRateLimitError,
  isNonceSmallError
} = require('bfx-report/workers/loc.api/helpers')
const {
  FindMethodError
} = require('bfx-report/workers/loc.api/errors')
const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')
const {
  filterMethodCollMapByList,
  invertSort,
  filterMethodCollMap,
  checkCollType,
  compareElemsDbAndApi,
  normalizeApiData,
  getAuthFromDb,
  getAllowedCollsNames,
  convertCurrency
} = require('./helpers')
const {
  delay,
  checkCollPermission
} = require('../helpers')
const {
  AsyncProgressHandlerIsNotFnError,
  AfterAllInsertsHookIsNotFnError
} = require('../../errors')

const MESS_ERR_UNAUTH = 'ERR_AUTH_UNAUTHORIZED'

class DataInserter extends EventEmitter {
  constructor (
    rService,
    dao,
    apiMiddleware,
    syncSchema,
    ALLOWED_COLLS,
    currencyConverter,
    FOREX_SYMBS
  ) {
    super()

    this.rService = rService
    this.dao = dao
    this.apiMiddleware = apiMiddleware
    this.syncSchema = syncSchema
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.currencyConverter = currencyConverter
    this.FOREX_SYMBS = FOREX_SYMBS

    this._asyncProgressHandler = null
    this._auth = null
    this._allowedCollsNames = getAllowedCollsNames(
      this.ALLOWED_COLLS
    )
    this._afterAllInsertsHooks = []

    this.convertTo = 'USD'

    this._candlesTimeframe = '1D'
    this._candlesSection = 'hist'
  }

  init (syncColls = this.ALLOWED_COLLS.ALL) {
    this.syncColls = Array.isArray(syncColls)
      ? syncColls
      : [syncColls]

    checkCollPermission(this.syncColls, this.ALLOWED_COLLS)

    this._methodCollMap = filterMethodCollMapByList(
      this.syncSchema,
      this.ALLOWED_COLLS,
      this.syncColls,
      this._allowedCollsNames
    )
    this.addAfterAllInsertsHooks(convertCurrency(
      this.dao,
      this.currencyConverter,
      this.ALLOWED_COLLS,
      this.convertTo,
      this.syncColls
    ))
  }

  setAsyncProgressHandler (cb) {
    if (typeof cb !== 'function') {
      throw new AsyncProgressHandlerIsNotFnError()
    }

    this._asyncProgressHandler = cb
  }

  async setProgress (progress) {
    if (this._asyncProgressHandler) {
      await this._asyncProgressHandler(progress)
    }

    this.emit('progress', progress)
  }

  async insertNewDataToDbMultiUser () {
    this._auth = await getAuthFromDb(this.dao)

    if (
      !this._auth ||
      !(this._auth instanceof Map) ||
      this._auth.size === 0
    ) {
      await this.setProgress(MESS_ERR_UNAUTH)

      return
    }

    let count = 0
    let progress = 0

    for (const authItem of this._auth) {
      if (typeof authItem[1] !== 'object') {
        continue
      }

      count += 1
      const userProgress = count / this._auth.size
      progress = await this.insertNewDataToDb(authItem[1], userProgress)
    }

    await this.insertNewPublicDataToDb(progress)

    await this._afterAllInserts()
    await this.setProgress(100)
  }

  async _afterAllInserts () {
    if (
      !Array.isArray(this._afterAllInsertsHooks) ||
      this._afterAllInsertsHooks.length === 0 ||
      this._afterAllInsertsHooks.some(hook => typeof hook !== 'function')
    ) {
      return
    }

    const promiseArr = this._afterAllInsertsHooks.map(hook => hook(this))

    return Promise.all(promiseArr)
  }

  addAfterAllInsertsHooks (hook) {
    if (typeof hook !== 'function') {
      throw new AfterAllInsertsHookIsNotFnError()
    }
    if (!Array.isArray(this._afterAllInsertsHooks)) {
      this._afterAllInsertsHooks = []
    }

    this._afterAllInsertsHooks.push(hook)
  }

  async insertNewPublicDataToDb (prevProgress) {
    const methodCollMap = await this.checkNewPublicData()
    const size = methodCollMap.size

    let count = 0
    let progress = 0

    for (const [method, item] of methodCollMap) {
      await this._updateApiDataArrObjTypeToDb(method, item)
      await this._updateApiDataArrTypeToDb(method, item)
      await this._insertApiDataPublicArrObjTypeToDb(method, item)

      count += 1
      progress = Math.round(prevProgress + (count / size) * 100 * ((100 - prevProgress) / 100))

      if (progress < 100) {
        await this.setProgress(progress)
      }
    }
  }

  async insertNewDataToDb (auth, userProgress = 1) {
    if (
      typeof auth.apiKey !== 'string' ||
      typeof auth.apiSecret !== 'string'
    ) {
      await this.setProgress(MESS_ERR_UNAUTH)

      return
    }

    const methodCollMap = await this.checkNewData(auth)
    const size = this._methodCollMap.size

    let count = 0
    let progress = 0

    for (const [method, item] of methodCollMap) {
      const args = this._getMethodArgMap(method, auth, 10000000, item.start)

      await this._insertApiDataArrObjTypeToDb(args, method, item)

      count += 1
      progress = Math.round((count / size) * 100 * userProgress)

      if (progress < 100) {
        await this.setProgress(progress)
      }
    }

    return progress
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

  async _checkNewDataPublicArrObjType (methodCollMap) {
    for (const [method, schema] of methodCollMap) {
      if (!this._isInsertableArrObjTypeOfColl(schema, true)) {
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
        await this._checkNewCandlesData(method, schema)

        continue
      }

      await this._checkItemNewDataArrObjType(method, schema)
    }
  }

  async _checkNewConfigurablePublicData (method, schema) {
    schema.hasNewData = false

    const symbFieldName = schema.symbolFieldName
    const publicСollsСonf = await this.dao.getElemsInCollBy(
      'publicСollsСonf',
      {
        filter: { confName: schema.confName },
        minPropName: 'start',
        groupPropName: 'symbol'
      }
    )

    if (isEmpty(publicСollsСonf)) {
      return
    }

    for (const { symbol, start } of publicСollsСonf) {
      const args = this._getMethodArgMap(method, {}, 1)
      args.params.notThrowError = true
      args.params.notCheckNextPage = true
      args.params.symbol = symbol
      const filter = { [symbFieldName]: symbol }
      const lastElemFromDb = await this.dao.getElemInCollBy(
        schema.name,
        filter,
        schema.sort
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
          lastElemFromApi[0][symbFieldName] &&
          typeof lastElemFromApi[0][symbFieldName] === 'string' &&
          lastElemFromApi[0][symbFieldName] !== symbol
        )
      ) {
        continue
      }
      if (isEmpty(lastElemFromDb)) {
        schema.hasNewData = true
        schema.start.push([symbol, { currStart: start }])

        continue
      }

      const lastDateInDb = compareElemsDbAndApi(
        schema.dateFieldName,
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
        schema.name,
        filter,
        invertSort(schema.sort)
      )

      if (!isEmpty(firstElemFromDb)) {
        const isChangedBaseStart = compareElemsDbAndApi(
          schema.dateFieldName,
          { [schema.dateFieldName]: start },
          firstElemFromDb
        )

        if (isChangedBaseStart) {
          schema.hasNewData = true
          startConf.baseStartFrom = start
          startConf.baseStartTo = firstElemFromDb[schema.dateFieldName] - 1
        }
      }

      schema.start.push([symbol, startConf])
    }
  }

  async _checkItemNewDataArrObjType (
    method,
    schema,
    auth
  ) {
    schema.hasNewData = false

    const args = this._getMethodArgMap(method, auth, 1)
    args.params.notThrowError = true
    args.params.notCheckNextPage = true
    const lastElemFromDb = await this.dao.getLastElemFromDb(
      schema.name,
      { ...auth },
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

  async _checkNewDataArrObjType (auth, methodCollMap) {
    for (const [method, item] of methodCollMap) {
      if (!this._isInsertableArrObjTypeOfColl(item)) {
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

  _isInsertableArrObjTypeOfColl (coll, isPublic) {
    return checkCollType(
      'insertable:array:objects',
      coll,
      isPublic
    )
  }

  _isUpdatableArrObjTypeOfColl (coll, isPublic) {
    return checkCollType(
      'updatable:array:objects',
      coll,
      isPublic
    )
  }

  _isUpdatableArrTypeOfColl (coll, isPublic) {
    return checkCollType(
      'updatable:array',
      coll,
      isPublic
    )
  }

  async _getDataFromApi (methodApi, args, isCheckCall) {
    if (!this.apiMiddleware.hasMethod(methodApi)) {
      throw new FindMethodError()
    }

    const ms = 80000

    let countRateLimitError = 0
    let countNonceSmallError = 0
    let res = null

    while (true) {
      try {
        res = await this.apiMiddleware.request(
          methodApi,
          cloneDeep(args),
          isCheckCall
        )

        break
      } catch (err) {
        if (isRateLimitError(err)) {
          countRateLimitError += 1

          if (countRateLimitError > 2) {
            throw err
          }

          await delay(ms)

          continue
        } else if (isNonceSmallError(err)) {
          countNonceSmallError += 1

          if (countNonceSmallError > 20) {
            throw err
          }

          await delay(1000)

          continue
        } else throw err
      }
    }

    return res
  }

  async _insertApiDataPublicArrObjTypeToDb (
    methodApi,
    schema
  ) {
    if (!this._isInsertableArrObjTypeOfColl(schema, true)) {
      return
    }
    if (
      schema.name === this.ALLOWED_COLLS.PUBLIC_TRADES ||
      schema.name === this.ALLOWED_COLLS.TICKERS_HISTORY
    ) {
      for (const [symbol, dates] of schema.start) {
        await this._insertConfigurablePublicApiData(
          methodApi,
          schema,
          symbol,
          dates
        )
      }
    }
    if (schema.name === this.ALLOWED_COLLS.CANDLES) {
      await this._insertNewCandlesData(
        methodApi,
        schema
      )
    }
  }

  async _insertConfigurablePublicApiData (
    methodApi,
    schema,
    symbol,
    dates,
    addApiParams = {}
  ) {
    if (
      !dates ||
      typeof dates !== 'object'
    ) {
      return
    }
    if (
      Number.isInteger(dates.baseStartFrom) &&
      Number.isInteger(dates.baseStartTo)
    ) {
      const args = this._getMethodArgMap(
        methodApi,
        null,
        10000000,
        dates.baseStartFrom,
        dates.baseStartTo
      )
      args.params = {
        ...args.params,
        symbol,
        ...addApiParams
      }

      await this._insertApiDataArrObjTypeToDb(args, methodApi, schema, true)
    }
    if (Number.isInteger(dates.currStart)) {
      const args = this._getMethodArgMap(
        methodApi,
        null,
        10000000,
        dates.currStart
      )
      args.params = {
        ...args.params,
        symbol,
        ...addApiParams
      }

      await this._insertApiDataArrObjTypeToDb(args, methodApi, schema, true)
    }
  }

  async _insertApiDataArrObjTypeToDb (
    args,
    methodApi,
    schema,
    isPublic
  ) {
    if (!this._isInsertableArrObjTypeOfColl(schema, isPublic)) {
      return
    }

    const {
      name: collName,
      dateFieldName,
      model
    } = schema

    const _args = cloneDeep(args)
    _args.params.notThrowError = true
    const currIterationArgs = cloneDeep(_args)

    let count = 0
    let serialRequestsCount = 0

    while (true) {
      let { res, nextPage } = await this._getDataFromApi(
        methodApi,
        currIterationArgs
      )

      currIterationArgs.params.end = nextPage

      if (
        res &&
        Array.isArray(res) &&
        res.length === 0 &&
        nextPage &&
        Number.isInteger(nextPage) &&
        serialRequestsCount < 1
      ) {
        serialRequestsCount += 1

        continue
      }

      serialRequestsCount = 0

      if (
        !res ||
        !Array.isArray(res) ||
        res.length === 0
      ) break

      const lastItem = res[res.length - 1]

      if (
        !lastItem ||
        typeof lastItem !== 'object' ||
        !lastItem[dateFieldName] ||
        !Number.isInteger(lastItem[dateFieldName])
      ) break

      const currTime = lastItem[dateFieldName]
      let isAllData = false

      if (_args.params.start >= currTime) {
        res = res.filter((item) => _args.params.start <= item[dateFieldName])
        isAllData = true
      }

      if (_args.params.limit < (count + res.length)) {
        res.splice(_args.params.limit - count)
        isAllData = true
      }

      await this.dao.insertElemsToDb(
        collName,
        isPublic ? null : { ..._args.auth },
        normalizeApiData(res, model),
        { isReplacedIfExists: true }
      )

      count += res.length
      const needElems = _args.params.limit - count

      if (
        isAllData ||
        needElems <= 0 ||
        !nextPage ||
        !Number.isInteger(nextPage)
      ) {
        break
      }

      if (!Number.isInteger(currIterationArgs.params.end)) {
        currIterationArgs.params.end = lastItem[dateFieldName] - 1
      }
    }
  }

  async _updateApiDataArrTypeToDb (
    methodApi,
    schema
  ) {
    if (!this._isUpdatableArrTypeOfColl(schema, true)) {
      return
    }

    const {
      name: collName,
      field
    } = schema

    const args = this._getMethodArgMap(methodApi, {}, null, null, null)
    const elemsFromApi = await this._getDataFromApi(methodApi, args)

    if (
      Array.isArray(elemsFromApi) &&
      elemsFromApi.length > 0
    ) {
      await this.dao.removeElemsFromDbIfNotInLists(
        collName,
        { [field]: elemsFromApi }
      )
      await this.dao.insertElemsToDbIfNotExists(
        collName,
        null,
        elemsFromApi.map(item => ({ [field]: item }))
      )
    }
  }

  async _updateConfigurableApiDataArrObjTypeToDb (
    methodApi,
    schema
  ) {
    const {
      dateFieldName,
      name: collName,
      fields,
      model
    } = { ...schema }

    const publicСollsСonf = await this.dao.getElemsInCollBy(
      'publicСollsСonf',
      {
        filter: { confName: schema.confName },
        minPropName: 'start',
        groupPropName: 'symbol'
      }
    )

    if (isEmpty(publicСollsСonf)) {
      return
    }

    const elemsFromApi = []

    for (const { symbol, start } of publicСollsСonf) {
      const args = this._getMethodArgMap(
        methodApi,
        {},
        null,
        null,
        null,
        {
          symbol,
          filter: {
            $gte: { [dateFieldName]: start }
          },
          type: 'deriv' // TODO:
        }
      )
      const apiRes = await this._getDataFromApi(methodApi, args)
      const oneSymbElemsFromApi = (
        apiRes &&
        typeof apiRes === 'object' &&
        !Array.isArray(apiRes) &&
        Array.isArray(apiRes.res)
      )
        ? apiRes.res
        : apiRes

      if (!Array.isArray(oneSymbElemsFromApi)) {
        continue
      }

      elemsFromApi.push(...oneSymbElemsFromApi)
    }

    if (elemsFromApi.length > 0) {
      const lists = fields.reduce((obj, curr) => {
        obj[curr] = elemsFromApi.map(item => item[curr])

        return obj
      }, {})

      await this.dao.removeElemsFromDbIfNotInLists(
        collName,
        lists
      )
      await this.dao.insertElemsToDbIfNotExists(
        collName,
        null,
        normalizeApiData(elemsFromApi, model)
      )
    }
  }

  async _updateApiDataArrObjTypeToDb (
    methodApi,
    schema
  ) {
    if (!this._isUpdatableArrObjTypeOfColl(schema, true)) {
      return
    }

    const {
      name: collName,
      fields,
      model
    } = { ...schema }

    if (collName === this.ALLOWED_COLLS.STATUS_MESSAGES) {
      await this._updateConfigurableApiDataArrObjTypeToDb(
        methodApi,
        schema
      )

      return
    }

    const args = this._getMethodArgMap(
      methodApi,
      {},
      null,
      null,
      null
    )
    const apiRes = await this._getDataFromApi(methodApi, args)
    const elemsFromApi = (
      apiRes &&
      typeof apiRes === 'object' &&
      !Array.isArray(apiRes) &&
      Array.isArray(apiRes.res)
    )
      ? apiRes.res
      : apiRes

    if (
      Array.isArray(elemsFromApi) &&
      elemsFromApi.length > 0
    ) {
      const lists = fields.reduce((obj, curr) => {
        obj[curr] = elemsFromApi.map(item => item[curr])

        return obj
      }, {})

      await this.dao.removeElemsFromDbIfNotInLists(
        collName,
        lists
      )
      await this.dao.insertElemsToDbIfNotExists(
        collName,
        null,
        normalizeApiData(elemsFromApi, model)
      )
    }
  }

  _getMethodArgMap (
    method,
    auth,
    limit,
    start = 0,
    end = Date.now(),
    params
  ) {
    const _limit = limit !== null
      ? limit
      : this._methodCollMap.get(method).maxLimit

    return {
      auth: {
        ...(auth && typeof auth === 'object'
          ? auth
          : {
            apiKey: '',
            apiSecret: ''
          })
      },
      params: {
        ...params,
        limit: _limit,
        end,
        start
      }
    }
  }

  _getMethodCollMap () {
    return new Map(this._methodCollMap)
  }

  async _checkNewCandlesData (
    method,
    schema
  ) {
    schema.hasNewData = false

    const symbFieldName = schema.symbolFieldName
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

    const _collСonfig = uniqueLedgersSymbs.map(({ currency }) => {
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
        timeframe: this._candlesTimeframe,
        section: this._candlesSection,
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
        {},
        1,
        0,
        _start
      )
      const argsForReceivingStart = {
        ..._argsForReceivingStart,
        params: {
          ..._argsForReceivingStart.params,
          ...params
        }
      }

      const filter = { [symbFieldName]: symbol }
      const lastElemFromDb = await this.dao.getElemInCollBy(
        schema.name,
        filter,
        schema.sort
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
          lastElemFromApi[0][symbFieldName] &&
          typeof lastElemFromApi[0][symbFieldName] === 'string' &&
          lastElemFromApi[0][symbFieldName] !== symbol
        )
      ) {
        continue
      }

      const start = (
        Array.isArray(startElemFromApi) &&
        startElemFromApi[startElemFromApi.length - 1] &&
        typeof startElemFromApi[startElemFromApi.length - 1] === 'object' &&
        Number.isInteger(
          startElemFromApi[startElemFromApi.length - 1][schema.dateFieldName]
        )
      )
        ? startElemFromApi[startElemFromApi.length - 1][schema.dateFieldName]
        : _start

      if (isEmpty(lastElemFromDb)) {
        schema.hasNewData = true
        schema.start.push([symbol, { currStart: start }])

        continue
      }

      const lastDateInDb = compareElemsDbAndApi(
        schema.dateFieldName,
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
        schema.name,
        filter,
        invertSort(schema.sort)
      )

      if (!isEmpty(firstElemFromDb)) {
        const isChangedBaseStart = compareElemsDbAndApi(
          schema.dateFieldName,
          { [schema.dateFieldName]: start },
          firstElemFromDb
        )

        if (isChangedBaseStart) {
          schema.hasNewData = true
          startConf.baseStartFrom = start
          startConf.baseStartTo = firstElemFromDb[schema.dateFieldName] - 1
        }
      }

      schema.start.push([symbol, startConf])
    }
  }

  async _insertNewCandlesData (
    method,
    schema
  ) {
    for (const [symbol, dates] of schema.start) {
      await this._insertConfigurablePublicApiData(
        method,
        schema,
        symbol,
        dates,
        {
          timeframe: this._candlesTimeframe,
          section: this._candlesSection
        }
      )
    }
  }
}

decorate(injectable(), DataInserter)
decorate(inject(TYPES.RService), DataInserter, 0)
decorate(inject(TYPES.DAO), DataInserter, 1)
decorate(inject(TYPES.ApiMiddleware), DataInserter, 2)
decorate(inject(TYPES.SyncSchema), DataInserter, 3)
decorate(inject(TYPES.ALLOWED_COLLS), DataInserter, 4)
decorate(inject(TYPES.CurrencyConverter), DataInserter, 5)
decorate(inject(TYPES.FOREX_SYMBS), DataInserter, 6)

module.exports = DataInserter
