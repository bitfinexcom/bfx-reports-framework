'use strict'

const EventEmitter = require('events')
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
  CANDLES_SECTION,
  ALL_SYMBOLS_TO_SYNC
} = require('./const')
const {
  filterMethodCollMapByList,
  normalizeApiData,
  getAuthFromDb,
  getAllowedCollsNames,
  getMethodArgMap,
  getSyncCollName
} = require('./helpers')
const DataInserterHook = require('./hooks/data.inserter.hook')
const {
  checkCollPermission
} = require('../helpers')
const {
  isInsertableArrObjTypeOfColl,
  isUpdatableArrObjTypeOfColl,
  isUpdatableArrTypeOfColl
} = require('../schema/utils')
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
    FOREX_SYMBS,
    authenticator,
    convertCurrencyHook,
    recalcSubAccountLedgersBalancesHook,
    dataChecker,
    syncInterrupter,
    wsEventEmitter,
    syncCollsManager
  ) {
    super()

    this.rService = rService
    this.dao = dao
    this.apiMiddleware = apiMiddleware
    this.syncSchema = syncSchema
    this.TABLES_NAMES = TABLES_NAMES
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.FOREX_SYMBS = FOREX_SYMBS
    this.authenticator = authenticator
    this.convertCurrencyHook = convertCurrencyHook
    this.recalcSubAccountLedgersBalancesHook = recalcSubAccountLedgersBalancesHook
    this.dataChecker = dataChecker
    this.syncInterrupter = syncInterrupter
    this.wsEventEmitter = wsEventEmitter
    this.syncCollsManager = syncCollsManager

    this._asyncProgressHandlers = []
    this._auth = null
    this._allowedCollsNames = getAllowedCollsNames(
      this.ALLOWED_COLLS
    )
    this._afterAllInsertsHooks = []

    this._isInterrupted = this.syncInterrupter.hasInterrupted()
  }

  init (syncColls = this.ALLOWED_COLLS.ALL) {
    this.syncInterrupter.onceInterrupt(() => {
      this._isInterrupted = true
    })

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
    this.convertCurrencyHook.init({ syncColls: this.syncColls })
    this.addAfterAllInsertsHooks([
      this.convertCurrencyHook,
      this.recalcSubAccountLedgersBalancesHook
    ])
    this.dataChecker.init({ methodCollMap: this._methodCollMap })
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
    if (this._isInterrupted) {
      return
    }

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
      if (this._isInterrupted) {
        return
      }

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

    await this.wsEventEmitter
      .emitSyncingStep('DB_PREPARATION')
    await this._afterAllInserts()

    if (typeof this.dao.optimize === 'function') {
      await this.dao.optimize()
    }

    if (this._isInterrupted) {
      return
    }

    await this.setProgress(100)
  }

  async _afterAllInserts () {
    if (this._isInterrupted) {
      return
    }

    if (
      !Array.isArray(this._afterAllInsertsHooks) ||
      this._afterAllInsertsHooks.length === 0 ||
      this._afterAllInsertsHooks.some(h => !(h instanceof DataInserterHook))
    ) {
      return
    }

    for (const hook of this._afterAllInsertsHooks) {
      if (this._isInterrupted) {
        return
      }

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
    if (this._isInterrupted) {
      return
    }

    await this.wsEventEmitter
      .emitSyncingStep('CHECKING_NEW_PUBLIC_DATA')
    const methodCollMap = await this.dataChecker
      .checkNewPublicData()
    const size = methodCollMap.size

    let count = 0
    let progress = 0

    for (const [method, item] of methodCollMap) {
      if (this._isInterrupted) {
        return
      }

      await this.wsEventEmitter
        .emitSyncingStep(`SYNCING_${getSyncCollName(method)}`)

      await this._updateApiDataArrObjTypeToDb(method, item)
      await this._updateApiDataArrTypeToDb(method, item)
      await this._insertApiDataPublicArrObjTypeToDb(method, item)

      await this.syncCollsManager.setCollAsSynced({
        collName: method
      })

      count += 1
      progress = Math.round(
        prevProgress + (count / size) * 100 * ((100 - prevProgress) / 100)
      )

      if (progress < 100) {
        await this.setProgress(progress)
      }
    }
  }

  async insertNewDataToDb (auth, userProgress = 0) {
    if (this._isInterrupted) {
      return userProgress
    }
    if (
      typeof auth.apiKey !== 'string' ||
      typeof auth.apiSecret !== 'string'
    ) {
      await this.setProgress(MESS_ERR_UNAUTH)

      return userProgress
    }

    await this.wsEventEmitter.emitSyncingStepToOne(
      'CHECKING_NEW_PRIVATE_DATA',
      auth
    )
    const methodCollMap = await this.dataChecker
      .checkNewData(auth)
    const size = this._methodCollMap.size
    const { _id: userId } = { ...auth }

    let count = 0
    let progress = 0

    for (const [method, schema] of methodCollMap) {
      if (this._isInterrupted) {
        return userProgress
      }

      await this.wsEventEmitter.emitSyncingStepToOne(
        `SYNCING_${getSyncCollName(method)}`,
        auth
      )

      const { start } = schema

      for (const [symbol, dates] of start) {
        const { baseStartFrom = 0 } = { ...dates }
        const addApiParams = (
          !symbol ||
          symbol === ALL_SYMBOLS_TO_SYNC ||
          (
            Array.isArray(symbol) &&
            symbol.length === 0
          )
        )
          ? {}
          : { symbol }

        await this._insertConfigurableApiData(
          method,
          schema,
          { ...dates, baseStartFrom },
          addApiParams,
          auth
        )
      }

      await this.syncCollsManager.setCollAsSynced({
        collName: method, userId
      })

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

  _getDataFromApi (methodApi, args, isCheckCall) {
    if (!this.apiMiddleware.hasMethod(methodApi)) {
      throw new FindMethodError()
    }

    return getDataFromApi(
      methodApi,
      args,
      this.apiMiddleware.request.bind(this.apiMiddleware),
      isCheckCall,
      this.syncInterrupter
    )
  }

  async _insertApiDataPublicArrObjTypeToDb (
    methodApi,
    schema
  ) {
    if (
      this._isInterrupted ||
      !isInsertableArrObjTypeOfColl(schema, true)
    ) {
      return
    }

    const { name, start } = { ...schema }

    if (
      name === this.ALLOWED_COLLS.PUBLIC_TRADES ||
      name === this.ALLOWED_COLLS.TICKERS_HISTORY ||
      name === this.ALLOWED_COLLS.CANDLES
    ) {
      for (const [symbol, dates, timeframe] of start) {
        if (this._isInterrupted) {
          return
        }

        const addApiParams = name === this.ALLOWED_COLLS.CANDLES
          ? {
            symbol,
            timeframe,
            section: CANDLES_SECTION
          }
          : { symbol }

        await this._insertConfigurableApiData(
          methodApi,
          schema,
          dates,
          addApiParams
        )
      }
    }
  }

  async _insertConfigurableApiData (
    methodApi,
    schema,
    dates,
    addApiParams = {},
    auth = {}
  ) {
    if (this._isInterrupted) {
      return
    }

    const {
      baseStartFrom,
      baseStartTo,
      currStart
    } = { ...dates }

    if (
      Number.isInteger(baseStartFrom) &&
      Number.isInteger(baseStartTo)
    ) {
      const args = this._getMethodArgMap(
        methodApi,
        {
          auth,
          limit: 10000000,
          start: baseStartFrom,
          end: baseStartTo,
          params: { ...addApiParams }
        }
      )

      await this._insertApiDataArrObjTypeToDb(args, methodApi, schema)
    }
    if (Number.isInteger(currStart)) {
      const args = this._getMethodArgMap(
        methodApi,
        {
          auth,
          limit: 10000000,
          start: currStart,
          params: { ...addApiParams }
        }
      )

      await this._insertApiDataArrObjTypeToDb(args, methodApi, schema)
    }
  }

  async _insertApiDataArrObjTypeToDb (
    args,
    methodApi,
    schema
  ) {
    if (this._isInterrupted) {
      return
    }

    const { auth } = { ...args }
    const { apiKey, apiSecret } = { ...auth }
    const isPublic = (
      !apiKey ||
      typeof apiKey !== 'string' ||
      !apiSecret ||
      typeof apiSecret !== 'string'
    )

    if (!isInsertableArrObjTypeOfColl(schema, isPublic)) {
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
    const { auth: _auth } = { ..._args }
    const { session } = { ..._auth }
    const sessionAuth = isPublic || hasNotSubUserField
      ? null
      : { ...session }

    let count = 0
    let serialRequestsCount = 0

    while (true) {
      if (this._isInterrupted) {
        return
      }

      let {
        res,
        nextPage,
        isInterrupted
      } = await this._getDataFromApi(
        methodApi,
        currIterationArgs
      )

      if (isInterrupted) {
        return
      }

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
    if (
      this._isInterrupted ||
      !isUpdatableArrTypeOfColl(schema, true)
    ) {
      return
    }

    const {
      name: collName,
      field
    } = schema

    const args = this._getMethodArgMap(
      methodApi,
      { start: null, end: null })
    const elemsFromApi = await this._getDataFromApi(methodApi, args)

    if (
      elemsFromApi &&
      typeof elemsFromApi === 'object' &&
      elemsFromApi.isInterrupted
    ) {
      return
    }
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
    if (this._isInterrupted) {
      return
    }

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
      if (this._isInterrupted) {
        return
      }

      for (const type of syncingTypes) {
        if (this._isInterrupted) {
          return
        }

        const args = this._getMethodArgMap(
          methodApi,
          {
            start: null,
            end: null,
            params: {
              symbol,
              filter: {
                $gte: { [dateFieldName]: start }
              },
              type
            }
          }
        )
        const apiRes = await this._getDataFromApi(methodApi, args)
        const isApiResObj = (
          apiRes &&
          typeof apiRes === 'object'
        )

        if (
          isApiResObj &&
          apiRes.isInterrupted
        ) {
          return
        }

        const oneSymbElemsFromApi = (
          isApiResObj &&
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
    if (
      this._isInterrupted ||
      !isUpdatableArrObjTypeOfColl(schema, true)
    ) {
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
      { start: null, end: null }
    )
    const apiRes = await this._getDataFromApi(methodApi, args)
    const isApiResObj = (
      apiRes &&
      typeof apiRes === 'object'
    )

    if (
      isApiResObj &&
      apiRes.isInterrupted
    ) {
      return
    }

    const elemsFromApi = (
      isApiResObj &&
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

  _getMethodArgMap (method, opts) {
    return getMethodArgMap(
      this._methodCollMap.get(method),
      opts
    )
  }

  _getMethodCollMap () {
    return new Map(this._methodCollMap)
  }
}

decorate(injectable(), DataInserter)
decorate(inject(TYPES.RService), DataInserter, 0)
decorate(inject(TYPES.DAO), DataInserter, 1)
decorate(inject(TYPES.ApiMiddleware), DataInserter, 2)
decorate(inject(TYPES.SyncSchema), DataInserter, 3)
decorate(inject(TYPES.TABLES_NAMES), DataInserter, 4)
decorate(inject(TYPES.ALLOWED_COLLS), DataInserter, 5)
decorate(inject(TYPES.FOREX_SYMBS), DataInserter, 6)
decorate(inject(TYPES.Authenticator), DataInserter, 7)
decorate(inject(TYPES.ConvertCurrencyHook), DataInserter, 8)
decorate(inject(TYPES.RecalcSubAccountLedgersBalancesHook), DataInserter, 9)
decorate(inject(TYPES.DataChecker), DataInserter, 10)
decorate(inject(TYPES.SyncInterrupter), DataInserter, 11)
decorate(inject(TYPES.WSEventEmitter), DataInserter, 12)
decorate(inject(TYPES.SyncCollsManager), DataInserter, 12)

module.exports = DataInserter
