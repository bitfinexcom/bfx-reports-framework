'use strict'

const EventEmitter = require('events')
const moment = require('moment')
const {
  isEmpty,
  cloneDeep
} = require('lodash')
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

const TYPES = require('../../di/types')
const {
  filterMethodCollMapByList,
  invertSort,
  filterMethodCollMap,
  checkCollType,
  compareElemsDbAndApi,
  normalizeApiData,
  getAuthFromDb,
  getAllowedCollsNames
} = require('./helpers')
const DataInserterHook = require('./hooks/data.inserter.hook')
const {
  checkCollPermission
} = require('../helpers')
const {
  AsyncProgressHandlerIsNotFnError,
  AfterAllInsertsHookIsNotHookError
} = require('../../errors')

const MESS_ERR_UNAUTH = 'ERR_AUTH_UNAUTHORIZED'

class DataInserter extends EventEmitter {
  constructor (
    rService,
    dao,
    apiMiddleware,
    syncSchema,
    TABLES_NAMES,
    ALLOWED_COLLS,
    currencyConverter,
    FOREX_SYMBS,
    authenticator,
    convertCurrencyHook,
    recalcSubAccountLedgersBalancesHook
  ) {
    super()

    this.rService = rService
    this.dao = dao
    this.apiMiddleware = apiMiddleware
    this.syncSchema = syncSchema
    this.TABLES_NAMES = TABLES_NAMES
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.currencyConverter = currencyConverter
    this.FOREX_SYMBS = FOREX_SYMBS
    this.authenticator = authenticator
    this.convertCurrencyHook = convertCurrencyHook
    this.recalcSubAccountLedgersBalancesHook = recalcSubAccountLedgersBalancesHook

    this._asyncProgressHandlers = []
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
    this.convertCurrencyHook.init({
      convertTo: this.convertTo,
      syncColls: this.syncColls
    })
    this.addAfterAllInsertsHooks([
      this.convertCurrencyHook,
      this.recalcSubAccountLedgersBalancesHook
    ])
  }

  addAsyncProgressHandler (handler) {
    if (typeof handler !== 'function') {
      throw new AsyncProgressHandlerIsNotFnError()
    }

    this._asyncProgressHandlers.push(handler)
  }

  async setProgress (progress) {
    for (const handler of this._asyncProgressHandlers) {
      await handler(progress)
    }

    this.emit('progress', progress)
  }

  getAuth () {
    return this._auth
  }

  async insertNewDataToDbMultiUser () {
    this._auth = getAuthFromDb(this.authenticator)

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
      if (
        !authItem[1] ||
        typeof authItem[1] !== 'object'
      ) {
        continue
      }

      const userProgress = (count / this._auth.size) * 100

      progress = await this.insertNewDataToDb(authItem[1], userProgress)
      count += 1
    }

    await this.insertNewPublicDataToDb(progress)

    await this._afterAllInserts()
    await this.setProgress(100)
  }

  async _afterAllInserts () {
    if (
      !Array.isArray(this._afterAllInsertsHooks) ||
      this._afterAllInsertsHooks.length === 0 ||
      this._afterAllInsertsHooks.some(h => !(h instanceof DataInserterHook))
    ) {
      return
    }

    for (const hook of this._afterAllInsertsHooks) {
      await hook.execute()
    }
  }

  addAfterAllInsertsHooks (hook) {
    const hookArr = Array.isArray(hook)
      ? hook
      : [hook]

    if (hookArr.some((h) => !(h instanceof DataInserterHook))) {
      throw new AfterAllInsertsHookIsNotHookError()
    }
    if (!Array.isArray(this._afterAllInsertsHooks)) {
      this._afterAllInsertsHooks = []
    }

    hookArr.forEach((hook) => {
      hook.setDataInserter(this)
      hook.init()
    })

    this._afterAllInsertsHooks.push(...hookArr)
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

  async insertNewDataToDb (auth, userProgress = 0) {
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

      await this._insertApiDataArrObjTypeToDb(
        args,
        method,
        item
      )

      count += 1
      progress = Math.round(
        (((count / size) * 100) / this._auth.size) + userProgress
      )

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
        section: this._candlesSection,
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
        {},
        1,
        0,
        Date.now(),
        {
          ...params,
          ...timeframeParam,
          symbol
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
        this._pushConfigurablePublicDataStartConf(
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

      this._pushConfigurablePublicDataStartConf(
        schema,
        symbol,
        startConf,
        timeframe
      )
    }
  }

  _pushConfigurablePublicDataStartConf (
    schema,
    symbol,
    startConf = {},
    timeframe
  ) {
    const {
      baseStartFrom,
      baseStartTo,
      currStart
    } = { ...startConf }

    const currStartConfArr = schema.start
      .find(([symb, conf, tFrame]) => (
        symb === symbol &&
        (
          !timeframe ||
          tFrame === timeframe
        )
      ))

    if (!Array.isArray(currStartConfArr)) {
      schema.start.push([
        symbol,
        {
          baseStartFrom,
          baseStartTo,
          currStart
        },
        timeframe
      ])

      return
    }

    const currStartConf = { ...currStartConfArr[1] }
    const _startConf = {
      baseStartFrom: (
        Number.isInteger(currStartConf.baseStartFrom) &&
        (
          !Number.isInteger(baseStartFrom) ||
          currStartConf.baseStartFrom < baseStartFrom
        )
      )
        ? currStartConf.baseStartFrom
        : baseStartFrom,
      baseStartTo: (
        Number.isInteger(currStartConf.baseStartTo) &&
        (
          !Number.isInteger(baseStartTo) ||
          currStartConf.baseStartTo > baseStartTo
        )
      )
        ? currStartConf.baseStartTo
        : baseStartTo,
      currStart: (
        Number.isInteger(currStartConf.currStart) &&
        (
          !Number.isInteger(currStart) ||
          currStartConf.currStart < currStart
        )
      )
        ? currStartConf.currStart
        : currStart
    }

    currStartConfArr[1] = {
      ...currStartConf,
      ..._startConf
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

  _getDataFromApi (methodApi, args, isCheckCall) {
    if (!this.apiMiddleware.hasMethod(methodApi)) {
      throw new FindMethodError()
    }

    return getDataFromApi(
      methodApi,
      args,
      this.apiMiddleware.request.bind(this.apiMiddleware),
      isCheckCall
    )
  }

  async _insertApiDataPublicArrObjTypeToDb (
    methodApi,
    schema
  ) {
    if (!this._isInsertableArrObjTypeOfColl(schema, true)) {
      return
    }

    const { name, start } = { ...schema }

    if (
      name === this.ALLOWED_COLLS.PUBLIC_TRADES ||
      name === this.ALLOWED_COLLS.TICKERS_HISTORY ||
      name === this.ALLOWED_COLLS.CANDLES
    ) {
      for (const [symbol, dates, timeframe] of start) {
        const addApiParams = name === this.ALLOWED_COLLS.CANDLES
          ? {
            timeframe,
            section: this._candlesSection
          }
          : {}

        await this._insertConfigurablePublicApiData(
          methodApi,
          schema,
          symbol,
          dates,
          addApiParams
        )
      }
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

    const { subUserId } = { ...model }
    const hasNotSubUserField = (
      !subUserId ||
      typeof subUserId !== 'string'
    )
    const { auth } = { ..._args }
    const { session } = { ...auth }
    const sessionAuth = isPublic || hasNotSubUserField
      ? null
      : { ...session }

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
        sessionAuth,
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
      this.TABLES_NAMES.PUBLIC_COLLS_CONF,
      {
        filter: { confName: schema.confName },
        minPropName: 'start',
        groupPropName: 'symbol'
      }
    )

    if (isEmpty(publicСollsСonf)) {
      return
    }

    const syncingTypes = ['deriv']
    const elemsFromApi = []

    for (const { symbol, start } of publicСollsСonf) {
      for (const type of syncingTypes) {
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
            type
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
      await this.dao.insertElemsToDb(
        collName,
        null,
        normalizeApiData(elemsFromApi, model),
        { isReplacedIfExists: true }
      )
    }
  }

  _getMethodArgMap (
    method,
    reqAuth,
    reqLimit,
    start = 0,
    end = Date.now(),
    params
  ) {
    const limit = reqLimit !== null
      ? reqLimit
      : this._methodCollMap.get(method).maxLimit

    const { apiKey = '', apiSecret = '', subUser } = { ...reqAuth }
    const {
      apiKey: subUserApiKey,
      apiSecret: subUserApiSecret
    } = { ...subUser }
    const auth = (
      subUserApiKey &&
      typeof subUserApiKey === 'string' &&
      subUserApiSecret &&
      typeof subUserApiSecret === 'string'
    )
      ? {
        apiKey: subUserApiKey,
        apiSecret: subUserApiSecret,
        session: reqAuth
      }
      : { apiKey, apiSecret, session: reqAuth }

    return {
      auth,
      params: {
        ...params,
        limit,
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

      const filter = {
        [symbolFieldName]: symbol,
        [timeframeFieldName]: this._candlesTimeframe
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
        this._pushConfigurablePublicDataStartConf(
          schema,
          symbol,
          { currStart: start },
          this._candlesTimeframe
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

      this._pushConfigurablePublicDataStartConf(
        schema,
        symbol,
        startConf,
        this._candlesTimeframe
      )
    }
  }
}

decorate(injectable(), DataInserter)
decorate(inject(TYPES.RService), DataInserter, 0)
decorate(inject(TYPES.DAO), DataInserter, 1)
decorate(inject(TYPES.ApiMiddleware), DataInserter, 2)
decorate(inject(TYPES.SyncSchema), DataInserter, 3)
decorate(inject(TYPES.TABLES_NAMES), DataInserter, 4)
decorate(inject(TYPES.ALLOWED_COLLS), DataInserter, 5)
decorate(inject(TYPES.CurrencyConverter), DataInserter, 6)
decorate(inject(TYPES.FOREX_SYMBS), DataInserter, 7)
decorate(inject(TYPES.Authenticator), DataInserter, 8)
decorate(inject(TYPES.ConvertCurrencyHook), DataInserter, 9)
decorate(inject(TYPES.RecalcSubAccountLedgersBalancesHook), DataInserter, 10)

module.exports = DataInserter
