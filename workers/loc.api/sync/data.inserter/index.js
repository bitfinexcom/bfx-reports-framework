'use strict'

const EventEmitter = require('events')
const {
  isEmpty,
  cloneDeep
} = require('lodash')
const {
  FindMethodError
} = require('bfx-report/workers/loc.api/errors')

const {
  CANDLES_SECTION
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

const isTestEnv = process.env.NODE_ENV === 'test'

const MESS_ERR_UNAUTH = 'ERR_AUTH_UNAUTHORIZED'

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.RService,
  TYPES.DAO,
  TYPES.ApiMiddleware,
  TYPES.SyncSchema,
  TYPES.TABLES_NAMES,
  TYPES.ALLOWED_COLLS,
  TYPES.SYNC_API_METHODS,
  TYPES.FOREX_SYMBS,
  TYPES.Authenticator,
  TYPES.ConvertCurrencyHook,
  TYPES.RecalcSubAccountLedgersBalancesHook,
  TYPES.DataChecker,
  TYPES.SyncInterrupter,
  TYPES.WSEventEmitter,
  TYPES.SyncCollsManager,
  TYPES.GetDataFromApi,
  TYPES.SyncTempTablesManager,
  TYPES.SyncUserStepManager
]
class DataInserter extends EventEmitter {
  constructor (
    rService,
    dao,
    apiMiddleware,
    syncSchema,
    TABLES_NAMES,
    ALLOWED_COLLS,
    SYNC_API_METHODS,
    FOREX_SYMBS,
    authenticator,
    convertCurrencyHook,
    recalcSubAccountLedgersBalancesHook,
    dataChecker,
    syncInterrupter,
    wsEventEmitter,
    syncCollsManager,
    getDataFromApi,
    syncTempTablesManager,
    syncUserStepManager
  ) {
    super()

    this.rService = rService
    this.dao = dao
    this.apiMiddleware = apiMiddleware
    this.syncSchema = syncSchema
    this.TABLES_NAMES = TABLES_NAMES
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.FOREX_SYMBS = FOREX_SYMBS
    this.authenticator = authenticator
    this.convertCurrencyHook = convertCurrencyHook
    this.recalcSubAccountLedgersBalancesHook = recalcSubAccountLedgersBalancesHook
    this.dataChecker = dataChecker
    this.syncInterrupter = syncInterrupter
    this.wsEventEmitter = wsEventEmitter
    this.syncCollsManager = syncCollsManager
    this.getDataFromApi = getDataFromApi
    this.syncTempTablesManager = syncTempTablesManager
    this.syncUserStepManager = syncUserStepManager

    this._asyncProgressHandlers = []
    this._auth = null
    this._syncedSubUsers = new Set()
    this._allowedCollsNames = getAllowedCollsNames(
      this.ALLOWED_COLLS
    )
    this._afterAllInsertsHooks = []

    this._isInterrupted = this.syncInterrupter.hasInterrupted()
  }

  init (params) {
    this.syncInterrupter.onceInterrupt(() => {
      this._isInterrupted = true
    })

    const {
      syncColls = this.ALLOWED_COLLS.ALL,
      syncQueueId,
      ownerUserId,
      isOwnerScheduler
    } = params ?? {}
    this.syncQueueId = syncQueueId
    this.ownerUserId = ownerUserId
    this.isOwnerScheduler = isOwnerScheduler
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
    this.syncUserStepManager.init({ syncQueueId: this.syncQueueId })
    this.dataChecker.init({
      methodCollMap: this._methodCollMap,
      syncQueueId: this.syncQueueId
    })
    this.syncTempTablesManager.init({ syncQueueId: this.syncQueueId })
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

    this._auth = await getAuthFromDb(
      this.authenticator,
      {
        ownerUserId: this.ownerUserId,
        isOwnerScheduler: this.isOwnerScheduler
      }
    )

    if (
      !this._auth ||
      !(this._auth instanceof Map) ||
      this._auth.size === 0
    ) {
      await this.setProgress(MESS_ERR_UNAUTH)

      return
    }

    const syncedUsersMap = new Map()
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

      const {
        progress: currProgress,
        methodCollMap
      } = await this.insertNewDataToDb(authItem[1], userProgress)
      syncedUsersMap.set(authItem[0], {
        auth: authItem[1],
        methodCollMap
      })

      progress = currProgress
      count += 1
    }

    const {
      methodCollMap: pubMethodCollMap
    } = await this.insertNewPublicDataToDb(progress)

    await this.wsEventEmitter
      .emitSyncingStep('DB_PREPARATION')
    await this._afterAllInserts({
      syncedUsersMap,
      pubMethodCollMap
    })

    if (typeof this.dao.optimize === 'function') {
      await this.dao.optimize()
    }

    if (this._isInterrupted) {
      return
    }

    await this.setProgress(100)
  }

  async _afterAllInserts (params) {
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

    const {
      syncedUsersMap,
      pubMethodCollMap
    } = params
    const syncedAt = Date.now()

    for (const { auth, methodCollMap } of syncedUsersMap) {
      const { userId, subUserId } = this._getUserIds(auth)

      for (const [collName, schema] of methodCollMap) {
        await this.syncUserStepManager.updateOrInsertSyncInfoForCurrColl(
          schema,
          {
            collName,
            userId,
            subUserId,
            syncedAt,
            isBaseStepReady: true,
            isCurrStepReady: true
          }
        )
      }
    }
    for (const [collName, schema] of pubMethodCollMap) {
      await this.syncUserStepManager.updateOrInsertSyncInfoForCurrColl(
        schema,
        {
          collName,
          syncedAt,
          isBaseStepReady: true,
          isCurrStepReady: true
        }
      )
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
      return { methodCollMap: new Map() }
    }

    await this.wsEventEmitter
      .emitSyncingStep('CHECKING_NEW_PUBLIC_DATA')
    const methodCollMap = await this.dataChecker
      .checkNewPublicData()
    await this.syncTempTablesManager
      .createTempDBStructureForCurrSync(methodCollMap)
    const size = methodCollMap.size

    let count = 0
    let progress = 0

    for (const [method, schema] of methodCollMap) {
      if (this._isInterrupted) {
        return { methodCollMap: new Map() }
      }

      await this.wsEventEmitter
        .emitSyncingStep(`SYNCING_${getSyncCollName(method)}`)

      await this._updateApiDataArrObjTypeToDb(method, schema)
      await this._updateApiDataArrTypeToDb(method, schema)
      await this._insertApiDataPublicArrObjTypeToDb(method, schema)

      // TODO:
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

    return { methodCollMap }
  }

  async insertNewDataToDb (auth, userProgress = 0) {
    if (this._isInterrupted) {
      return {
        progress: userProgress,
        methodCollMap: new Map()
      }
    }
    if (
      typeof auth.apiKey !== 'string' ||
      typeof auth.apiSecret !== 'string'
    ) {
      await this.setProgress(MESS_ERR_UNAUTH)

      return {
        progress: userProgress,
        methodCollMap: new Map()
      }
    }

    await this.wsEventEmitter.emitSyncingStepToOne(
      'CHECKING_NEW_PRIVATE_DATA',
      auth
    )
    const methodCollMap = await this.dataChecker
      .checkNewData(auth)
    await this.syncTempTablesManager
      .createTempDBStructureForCurrSync(methodCollMap)
    const size = this._methodCollMap.size
    const { isSubAccount } = auth ?? {}
    const { userId, subUserId } = this._getUserIds(auth)
    const isLastSubUser = this._isLastSubUser(auth)

    let count = 0
    let progress = 0

    for (const [method, schema] of methodCollMap) {
      if (this._isInterrupted) {
        return {
          progress: userProgress,
          methodCollMap: new Map()
        }
      }

      await this.wsEventEmitter.emitSyncingStepToOne(
        `SYNCING_${getSyncCollName(method)}`,
        auth
      )

      const { start } = schema ?? {}

      for (const syncUserStepData of start) {
        await this._insertConfigurableApiData(
          method,
          schema,
          syncUserStepData,
          auth
        )
      }

      await this.prepareData({ method }, { isLastSubUser })

      // TODO:
      await this.syncCollsManager.setCollAsSynced({
        collName: method, userId, subUserId
      })

      count += 1
      progress = Math.round(
        (((count / size) * 100) / this._auth.size) + userProgress
      )

      if (progress < 100) {
        await this.setProgress(progress)
      }
    }

    // After whole sync prepare collections if it's not done earlier
    await this.prepareData({ methodCollMap }, { isLastSubUser })

    if (isSubAccount) {
      this._setSyncedSubUser(userId, subUserId)
    }

    return { progress, methodCollMap }
  }

  async prepareData (args = {}, opts = {}) {
    await this._prepareLedgers(args, opts)
    await this._prepareMovements(args, opts)
  }

  /* If ledgers are syncing
    sync candles,
    convert currency,
    recalc sub-account */
  async _prepareLedgers (args = {}, opts = {}) {
    const {
      method = this.SYNC_API_METHODS.LEDGERS,
      methodCollMap
    } = args ?? {}
    const { isLastSubUser } = opts ?? {}

    if (
      method !== this.SYNC_API_METHODS.LEDGERS ||
      (
        methodCollMap instanceof Map &&
        methodCollMap.has(this.SYNC_API_METHODS.LEDGERS)
      )
    ) {
      return
    }

    const candlesSchema = this.syncSchema
      .getMethodCollMap().get(this.SYNC_API_METHODS.CANDLES)

    await this.dataChecker.checkNewCandlesData(
      this.SYNC_API_METHODS.CANDLES,
      candlesSchema
    )
    await this.syncTempTablesManager.createTempDBStructureForCurrSync(new Map([[
      this.SYNC_API_METHODS.CANDLES,
      candlesSchema
    ]]))
    await this._insertApiDataPublicArrObjTypeToDb(
      this.SYNC_API_METHODS.CANDLES,
      candlesSchema
    )
    // TODO:
    await this.syncCollsManager.setCollAsSynced({
      collName: this.SYNC_API_METHODS.CANDLES
    })

    candlesSchema.isSyncDoneForCurrencyConv = true

    await this.convertCurrencyHook.execute(
      this.ALLOWED_COLLS.LEDGERS
    )

    if (!isLastSubUser) {
      return
    }

    await this.recalcSubAccountLedgersBalancesHook.execute()
  }

  /* If movements are syncing
    convert currency */
  async _prepareMovements (args = {}) {
    const {
      method = this.SYNC_API_METHODS.MOVEMENTS,
      methodCollMap
    } = args ?? {}

    if (
      method !== this.SYNC_API_METHODS.MOVEMENTS ||
      (
        methodCollMap instanceof Map &&
        methodCollMap.has(this.SYNC_API_METHODS.MOVEMENTS)
      )
    ) {
      return
    }

    await this.convertCurrencyHook.execute(
      this.ALLOWED_COLLS.MOVEMENTS
    )
  }

  _getDataFromApi (methodApi, args, isCheckCall) {
    if (!this.apiMiddleware.hasMethod(methodApi)) {
      throw new FindMethodError()
    }

    return this.getDataFromApi({
      getData: methodApi,
      args,
      middleware: this.apiMiddleware.request.bind(this.apiMiddleware),
      middlewareParams: isCheckCall,
      callerName: 'DATA_SYNCER'
    })
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

    const { name, start } = schema ?? {}

    if (
      name === this.ALLOWED_COLLS.PUBLIC_TRADES ||
      name === this.ALLOWED_COLLS.TICKERS_HISTORY ||
      name === this.ALLOWED_COLLS.CANDLES
    ) {
      for (const syncUserStepData of start) {
        await this._insertConfigurableApiData(
          methodApi,
          schema,
          syncUserStepData
        )
      }
    }
  }

  // TODO:
  async _insertConfigurableApiData (
    methodApi,
    schema,
    syncUserStepData,
    auth = {}
  ) {
    if (this._isInterrupted) {
      return
    }

    const { userId, subUserId } = this._getUserIds(auth)
    await this.syncUserStepManager.updateOrInsertSyncInfoForCurrColl(
      schema,
      {
        collName: methodApi,
        userId,
        subUserId,
        syncUserStepData
      }
    )

    const {
      symbol,
      timeframe,
      baseStart,
      baseEnd,
      currStart,
      currEnd,
      isBaseStepReady,
      isCurrStepReady,
      hasBaseStep,
      hasCurrStep,
      hasSymbol,
      hasTimeframe,
      areAllSymbolsRequired
    } = syncUserStepData
    const hasCandlesSection = schema.name === this.ALLOWED_COLLS.CANDLES

    const params = {}

    if (
      hasSymbol &&
      !areAllSymbolsRequired
    ) {
      params.symbol = symbol
    }
    if (hasTimeframe) {
      params.timeframe = timeframe
    }
    if (hasCandlesSection) {
      params.section = CANDLES_SECTION
    }

    if (
      !isBaseStepReady &&
      hasBaseStep
    ) {
      const args = this._getMethodArgMap(
        schema,
        {
          auth,
          limit: 10000000,
          start: baseStart,
          end: baseEnd,
          params
        }
      )

      await this._insertApiDataArrObjTypeToDb(args, methodApi, schema)
    }
    if (
      !isCurrStepReady &&
      hasCurrStep
    ) {
      const args = this._getMethodArgMap(
        schema,
        {
          auth,
          limit: 10000000,
          start: currStart,
          end: currEnd,
          params
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

    const { auth } = args ?? {}
    const { apiKey, apiSecret } = auth ?? {}
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

    const { subUserId } = model ?? {}
    const hasNotSubUserField = (
      !subUserId ||
      typeof subUserId !== 'string'
    )
    const { auth: _auth } = _args ?? {}
    const { session } = _auth ?? {}
    const sessionAuth = isPublic || hasNotSubUserField
      ? null
      : { ...session }

    let count = 0
    let serialRequestsCount = 0
    let prevRes = []

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

      const normalizedApiData = normalizeApiData(res, model)

      /*
       * As the test mock server always returns
       * the same mocked data, here is required
       * to finish syncing if all data is the same
       * in the next sync iteration to avoid an infinity loop,
       * but no need for this checking in non-test env
       * to reduce loading
       */
      if (
        isTestEnv &&
        prevRes.length > 0 &&
        normalizedApiData.every((item) => (
          prevRes.some((prevItem) => (
            Object.keys(item).every((key) => (
              typeof item?.[key] === 'object'
                ? JSON.stringify(item[key]) === JSON.stringify(prevItem[key])
                : item[key] === prevItem[key]
            ))
          ))
        ))
      ) {
        isAllData = true
      }

      prevRes = normalizedApiData

      await this.dao.insertElemsToDb(
        this._getTempTableName(collName),
        sessionAuth,
        normalizedApiData,
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
      schema,
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
          schema,
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
      schema,
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
    const schema = typeof method === 'string'
      ? this._methodCollMap.get(method)
      : method

    return getMethodArgMap(schema, opts)
  }

  _getMethodCollMap () {
    return new Map(this._methodCollMap)
  }

  _isLastSubUser (auth = {}) {
    const {
      _id: userId,
      subUser,
      subUsers,
      isSubAccount
    } = auth ?? {}
    const { _id: subUserId } = subUser ?? {}
    const restSubUsers = subUsers.filter((user) => (
      user?._id !== subUserId
    ))
    const currSubUser = this._getSyncedSubUser(userId, subUserId)

    return (
      isSubAccount &&
      !this._syncedSubUsers.has(currSubUser) &&
      restSubUsers.every((subUser) => (
        this._syncedSubUsers
          .has(this._getSyncedSubUser(userId, subUser?._id))
      ))
    )
  }

  _setSyncedSubUser (userId, subUserId) {
    if (!(this._syncedSubUsers instanceof Set)) {
      this._syncedSubUsers = new Set()
    }

    this._syncedSubUsers
      .add(this._getSyncedSubUser(userId, subUserId))
  }

  _getSyncedSubUser (userId, subUserId) {
    return `${userId}-${subUserId}`
  }

  _getUserIds (auth) {
    const {
      _id: userId,
      subUser
    } = auth ?? {}
    const { _id: subUserId } = subUser ?? {}

    return { userId, subUserId }
  }

  _getTempTableName (tableName) {
    const prefix = this.syncTempTablesManager
      .getCurrNamePrefix(this.syncQueueId)

    return `${prefix}${tableName}`
  }
}

decorateInjectable(DataInserter, depsTypes)

module.exports = DataInserter
