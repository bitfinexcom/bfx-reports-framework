'use strict'

const { promisify } = require('util')
const setImmediatePromise = promisify(setImmediate)

const EventEmitter = require('events')
const {
  cloneDeep
} = require('lib-js-util-base')
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
  isInsertableArrObj,
  isUpdatableArrObj,
  isUpdatableArr,
  isUpdatable,
  isPublic
} = require('../schema/utils')
const {
  AsyncProgressHandlerIsNotFnError,
  AfterAllInsertsHookIsNotHookError
} = require('../../errors')

const isTestEnv = process.env.NODE_ENV === 'test'

const MESS_ERR_UNAUTH = 'ERR_AUTH_UNAUTHORIZED'

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.ApiMiddleware,
  TYPES.SyncSchema,
  TYPES.ALLOWED_COLLS,
  TYPES.TABLES_NAMES,
  TYPES.Authenticator,
  TYPES.ConvertCurrencyHook,
  TYPES.ConvertCurrencyHook,
  TYPES.RecalcSubAccountLedgersBalancesHook,
  TYPES.RecalcSubAccountLedgersBalancesHook,
  TYPES.DataChecker,
  TYPES.SyncInterrupter,
  TYPES.WSEventEmitter,
  TYPES.GetDataFromApi,
  TYPES.SyncTempTablesManager,
  TYPES.SyncUserStepManager,
  TYPES.Progress
]
class DataInserter extends EventEmitter {
  constructor (
    dao,
    apiMiddleware,
    syncSchema,
    ALLOWED_COLLS,
    TABLES_NAMES,
    authenticator,
    convertCurrencyHook,
    convertCurrencyHookWithoutTempTable,
    recalcSubAccountLedgersBalancesHook,
    recalcSubAccountLedgersBalancesHookWithoutTempTable,
    dataChecker,
    syncInterrupter,
    wsEventEmitter,
    getDataFromApi,
    syncTempTablesManager,
    syncUserStepManager,
    progress
  ) {
    super()

    this.dao = dao
    this.apiMiddleware = apiMiddleware
    this.syncSchema = syncSchema
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.TABLES_NAMES = TABLES_NAMES
    this.authenticator = authenticator
    this.convertCurrencyHook = convertCurrencyHook
    this.convertCurrencyHookWithoutTempTable = convertCurrencyHookWithoutTempTable
    this.recalcSubAccountLedgersBalancesHook = recalcSubAccountLedgersBalancesHook
    this.recalcSubAccountLedgersBalancesHookWithoutTempTable = recalcSubAccountLedgersBalancesHookWithoutTempTable
    this.dataChecker = dataChecker
    this.syncInterrupter = syncInterrupter
    this.wsEventEmitter = wsEventEmitter
    this.getDataFromApi = getDataFromApi
    this.syncTempTablesManager = syncTempTablesManager
    this.syncUserStepManager = syncUserStepManager
    this.progress = progress

    this._asyncProgressHandlers = []
    this._auth = null
    this._sessionAuth = null
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
    this._addAfterAllInsertsHooks([
      this.convertCurrencyHook,
      this.recalcSubAccountLedgersBalancesHook
    ])

    /*
     * This hook, without `syncQueueId`, covers sub-account recalc
     * for non-temp ledgers table in cases when sub-users being added/removed
     */
    this._addAfterAllInsertsHooks(
      this.convertCurrencyHookWithoutTempTable,
      { syncQueueId: null }
    )
    this._addAfterAllInsertsHooks(
      this.recalcSubAccountLedgersBalancesHookWithoutTempTable,
      { syncQueueId: null }
    )
    this.syncUserStepManager.init({ syncQueueId: this.syncQueueId })
    this.dataChecker.init({
      methodCollMap: this._methodCollMap,
      syncQueueId: this.syncQueueId
    })
    this.syncTempTablesManager.init({ syncQueueId: this.syncQueueId })
  }

  getAuth () { return this._auth }

  addAsyncProgressHandler (handler) {
    if (typeof handler !== 'function') {
      throw new AsyncProgressHandlerIsNotFnError()
    }

    this._asyncProgressHandlers.push(handler)
  }

  async insertNewDataToDbMultiUser () {
    if (this._isInterrupted) {
      return
    }

    const { sessionAuth, syncAuth } = await getAuthFromDb(
      this.authenticator,
      {
        ownerUserId: this.ownerUserId,
        isOwnerScheduler: this.isOwnerScheduler
      }
    )
    this._auth = syncAuth
    this._sessionAuth = sessionAuth

    if (
      !this._auth ||
      !(this._auth instanceof Map) ||
      this._auth.size === 0
    ) {
      await this._setProgress(MESS_ERR_UNAUTH)

      return
    }

    await this.syncTempTablesManager
      .cleanUpTempDBStructure()

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
      } = await this._insertNewDataToDb(authItem[1], userProgress)
      syncedUsersMap.set(authItem[0], {
        auth: authItem[1],
        methodCollMap
      })

      progress = currProgress
      count += 1
    }

    const {
      methodCollMap: pubMethodCollMap
    } = await this._insertNewPublicDataToDb(progress)

    await this._afterAllInserts({
      syncedUsersMap,
      pubMethodCollMap
    })

    if (this._isInterrupted) {
      return
    }

    await this._setProgress(100)
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

    await this.wsEventEmitter
      .emitSyncingStep('DB_PREPARATION')

    for (const hook of this._afterAllInsertsHooks) {
      if (this._isInterrupted) {
        return
      }

      await hook.execute()
    }

    await this._updateSyncInfo(params)
  }

  async _insertNewPublicDataToDb (prevProgress) {
    if (this._isInterrupted) {
      return { methodCollMap: new Map() }
    }

    await this.wsEventEmitter
      .emitSyncingStep('CHECKING_NEW_PUBLIC_DATA')
    const methodCollMap = await this.dataChecker
      .checkNewPublicData(this._auth)
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

      const name = schema.getModelField('NAME')
      const type = schema.getModelField('TYPE')
      const start = schema.getModelField('START')

      if (name === this.ALLOWED_COLLS.CANDLES) {
        // Considers 10 reqs/min for candles
        const leftTime = Math.floor((60 / 10) * start.length * 1000)
        this.progress.setCandlesLeftTime(leftTime)
      }

      for (const syncUserStepData of start) {
        if (isInsertableArrObj(type, { isPublic: true })) {
          await this._insertApiData(
            method,
            schema,
            syncUserStepData
          )
        }
        if (
          isUpdatable(type) &&
          isPublic(type)
        ) {
          await this._updateApiData(
            method,
            schema,
            syncUserStepData
          )
        }
      }

      count += 1
      progress = Math.round(
        prevProgress + (count / size) * 100 * ((100 - prevProgress) / 100)
      )

      if (progress < 100) {
        await this._setProgress(progress)
      }

      await this._optimizeDb()
    }

    return { methodCollMap }
  }

  async _insertNewDataToDb (auth, userProgress = 0) {
    if (this._isInterrupted) {
      return {
        progress: userProgress,
        methodCollMap: new Map()
      }
    }
    if (
      (
        typeof auth?.apiKey !== 'string' ||
        typeof auth?.apiSecret !== 'string'
      ) &&
      !auth?.authToken
    ) {
      await this._setProgress(MESS_ERR_UNAUTH)

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

      const start = schema.getModelField('START')

      for (const syncUserStepData of start) {
        await this._insertApiData(
          method,
          schema,
          syncUserStepData,
          auth
        )
      }

      count += 1
      progress = Math.round(
        (((count / size) * 100) / this._auth.size) + userProgress
      )

      if (progress < 100) {
        await this._setProgress(progress)
      }

      await this._optimizeDb()
    }

    return { progress, methodCollMap }
  }

  async _insertApiData (
    methodApi,
    schema,
    syncUserStepData,
    auth = {}
  ) {
    if (this._isInterrupted) {
      return
    }

    const name = schema.getModelField('NAME')
    const hasCandlesSection = name === this.ALLOWED_COLLS.CANDLES
    const _auth = (
      hasCandlesSection &&
      syncUserStepData?.auth
    )
      ? syncUserStepData.auth
      : auth
    const { userId, subUserId } = this._getUserIds(_auth)
    await this.syncUserStepManager.updateOrInsertSyncInfoForCurrColl({
      collName: methodApi,
      userId,
      subUserId,
      syncUserStepData
    })

    const {
      symbol,
      timeframe,
      baseStart,
      baseEnd,
      currStart,
      currEnd,
      hasSymbol,
      hasTimeframe,
      areAllSymbolsRequired
    } = syncUserStepData

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

    if (this.syncUserStepManager.shouldBaseStepBeSynced(syncUserStepData)) {
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

      syncUserStepData.wasBaseStepsBeSynced = true
    }
    if (this.syncUserStepManager.shouldCurrStepBeSynced(syncUserStepData)) {
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

      syncUserStepData.wasCurrStepsBeSynced = true
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
    const { authToken, apiKey, apiSecret } = auth ?? {}
    const isPublic = (
      (
        !apiKey ||
        typeof apiKey !== 'string' ||
        !apiSecret ||
        typeof apiSecret !== 'string'
      ) &&
      !authToken
    )
    const isPrivate = !isPublic
    const type = schema.getModelField('TYPE')

    if (!isInsertableArrObj(type, { isPublic, isPrivate })) {
      return
    }

    const collName = schema.getModelField('NAME')
    const dateFieldName = schema.getModelField('DATE_FIELD_NAME')
    const model = schema.getModelField('MODEL')
    const shouldNotApiMiddlewareBeLaunched = schema
      .getModelField('SHOULD_NOT_API_MIDDLEWARE_BE_LAUNCHED')

    const _args = cloneDeep(args)
    _args.params.notThrowError = true
    const currIterationArgs = cloneDeep(_args)

    const hasNotSubUserField = !model.hasModelFieldName('subUserId')
    const { auth: _auth } = _args ?? {}
    const { session } = _auth ?? {}
    const sessionAuth = isPublic || hasNotSubUserField
      ? null
      : { ...session }

    let count = 0
    let serialRequestsCount = 0
    let serialRequestsCountWithEndLessThanStart = 0
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
        currIterationArgs,
        shouldNotApiMiddlewareBeLaunched
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

      // Prevent very rare issue: end <= start
      if (currIterationArgs.params.start >= currIterationArgs.params.end) {
        currIterationArgs.params.end = currIterationArgs.params.start + 1
        serialRequestsCountWithEndLessThanStart += 1
      }
      if (serialRequestsCountWithEndLessThanStart > 1) {
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
        this.syncTempTablesManager.constructor
          .getTempTableName(collName, this.syncQueueId),
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

  async _updateApiData (
    methodApi,
    schema,
    syncUserStepData
  ) {
    if (this._isInterrupted) {
      return
    }

    await this.syncUserStepManager.updateOrInsertSyncInfoForCurrColl({
      collName: methodApi,
      syncUserStepData
    })

    const {
      symbol,
      timeframe,
      baseStart,
      currStart,
      hasSymbol,
      hasTimeframe,
      areAllSymbolsRequired
    } = syncUserStepData
    const hasStatusMessagesSection = schema?.name === this.ALLOWED_COLLS.STATUS_MESSAGES

    const checkOpts = {
      shouldNotMtsBeChecked: true,
      shouldStartMtsBeChecked: hasStatusMessagesSection
    }
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
    if (hasStatusMessagesSection) {
      params.type = 'deriv'
    }

    if (this.syncUserStepManager
      .shouldBaseStepBeSynced(syncUserStepData, checkOpts)) {
      const statusMessagesParams = {
        ...params,
        filter: {
          $gte: { [schema?.dateFieldName]: baseStart }
        }
      }

      const args = this._getMethodArgMap(
        schema,
        {
          start: null,
          end: null,
          params: hasStatusMessagesSection
            ? statusMessagesParams
            : params
        }
      )

      await this._updateApiDataArrObjTypeToDb(args, methodApi, schema)
      await this._updateApiDataArrTypeToDb(methodApi, schema)

      syncUserStepData.wasBaseStepsBeSynced = true
    }
    if (this.syncUserStepManager
      .shouldCurrStepBeSynced(syncUserStepData, checkOpts)) {
      const statusMessagesParams = {
        ...params,
        filter: {
          $gte: { [schema?.dateFieldName]: currStart }
        }
      }

      const args = this._getMethodArgMap(
        schema,
        {
          start: null,
          end: null,
          params: hasStatusMessagesSection
            ? statusMessagesParams
            : params
        }
      )

      await this._updateApiDataArrObjTypeToDb(args, methodApi, schema)
      await this._updateApiDataArrTypeToDb(methodApi, schema)

      syncUserStepData.wasCurrStepsBeSynced = true
    }
  }

  async _updateApiDataArrTypeToDb (
    methodApi,
    schema
  ) {
    if (
      this._isInterrupted ||
      !isUpdatableArr(schema?.type, { isPublic: true })
    ) {
      return
    }

    const {
      name: collName,
      projection,
      shouldNotApiMiddlewareBeLaunched
    } = schema
    const _projection = Array.isArray(projection)
      ? projection
      : [projection]
    const fieldName = _projection[0]

    const args = this._getMethodArgMap(
      schema,
      { start: null, end: null })
    const elemsFromApi = await this._getDataFromApi(
      methodApi,
      args,
      shouldNotApiMiddlewareBeLaunched
    )

    if (
      elemsFromApi &&
      typeof elemsFromApi === 'object' &&
      elemsFromApi.isInterrupted
    ) {
      return
    }

    if (
      !Array.isArray(elemsFromApi) ||
      elemsFromApi.length === 0
    ) {
      return
    }

    await this.dao.insertElemsToDb(
      this.syncTempTablesManager.constructor
        .getTempTableName(collName, this.syncQueueId),
      null,
      elemsFromApi.map((item) => ({ [fieldName]: item })),
      {
        isReplacedIfExists: true,
        isStrictEqual: true
      }
    )
  }

  async _updateApiDataArrObjTypeToDb (
    args,
    methodApi,
    schema
  ) {
    if (
      this._isInterrupted ||
      !isUpdatableArrObj(schema?.type, { isPublic: true })
    ) {
      return
    }

    const {
      name: collName,
      model,
      shouldNotApiMiddlewareBeLaunched
    } = schema ?? {}

    const apiRes = await this._getDataFromApi(
      methodApi,
      args,
      shouldNotApiMiddlewareBeLaunched
    )
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
      !Array.isArray(elemsFromApi) ||
      elemsFromApi.length === 0
    ) {
      return
    }

    await this.dao.insertElemsToDb(
      this.syncTempTablesManager.constructor
        .getTempTableName(collName, this.syncQueueId),
      null,
      normalizeApiData(elemsFromApi, model),
      {
        isReplacedIfExists: true,
        isStrictEqual: true
      }
    )
  }

  async _updateSyncInfo (params) {
    await this.wsEventEmitter
      .emitSyncingStep('MOVING_DATA_FROM_TEMP_TABLES')

    await this.dao.executeQueriesInTrans(async () => {
      await this.syncTempTablesManager
        .moveTempTableDataToMain({
          isNotInTrans: true,
          doNotQueueQuery: true
        })

      const {
        syncedUsersMap,
        pubMethodCollMap
      } = params
      const syncedAt = Date.now()
      const updatesForPubCollsPromises = []

      for (const [, { auth, methodCollMap }] of syncedUsersMap) {
        const { userId, subUserId } = this._getUserIds(auth)
        const updatesForOneUserPromises = []

        for (const [collName, schema] of methodCollMap) {
          if (
            !Array.isArray(schema?.start) ||
            schema.start.length === 0
          ) {
            continue
          }

          updatesForOneUserPromises.push(setImmediatePromise())

          const promise = this.syncUserStepManager.updateOrInsertSyncInfoForCurrColl({
            collName,
            userId,
            subUserId,
            syncedAt,
            ...this.syncUserStepManager.wereStepsSynced(
              schema.start,
              { shouldNotMtsBeChecked: isUpdatable(schema?.type) }
            )
          }, { doNotQueueQuery: true })
          updatesForOneUserPromises.push(promise)
        }

        await Promise.all(updatesForOneUserPromises)
      }
      for (const [collName, schema] of pubMethodCollMap) {
        if (
          !Array.isArray(schema?.start) ||
          schema.start.length === 0
        ) {
          continue
        }

        const startWithAuth = schema.start
          .filter((syncUserStepData) => syncUserStepData?.auth)
        const startWithoutAuth = schema.start
          .filter((syncUserStepData) => !syncUserStepData?.auth)

        if (startWithAuth.length > 0) {
          for (const syncUserStepData of startWithAuth) {
            const { userId, subUserId } = this._getUserIds(syncUserStepData.auth)

            const promise = this.syncUserStepManager.updateOrInsertSyncInfoForCurrColl({
              collName,
              userId,
              subUserId,
              syncedAt,
              ...this.syncUserStepManager.wereStepsSynced(
                [syncUserStepData],
                {
                  shouldNotMtsBeChecked: isUpdatable(schema?.type),
                  shouldStartMtsBeChecked: schema?.name === this.ALLOWED_COLLS.STATUS_MESSAGES
                }
              )
            }, { doNotQueueQuery: true })

            updatesForPubCollsPromises.push(promise)
          }
        }
        if (startWithoutAuth.length > 0) {
          const promise = this.syncUserStepManager.updateOrInsertSyncInfoForCurrColl({
            collName,
            syncedAt,
            ...this.syncUserStepManager.wereStepsSynced(
              schema.start,
              {
                shouldNotMtsBeChecked: isUpdatable(schema?.type),
                shouldStartMtsBeChecked: schema?.name === this.ALLOWED_COLLS.STATUS_MESSAGES
              }
            )
          }, { doNotQueueQuery: true })

          updatesForPubCollsPromises.push(promise)
        }
      }

      await Promise.all(updatesForPubCollsPromises)

      await this.syncTempTablesManager
        .removeTempDBStructureForCurrSync({
          isNotInTrans: true,
          doNotQueueQuery: true
        })

      await this._setUserSyncState({ doNotQueueQuery: true })
    })
  }

  async _setUserSyncState (opts) {
    const didNotAllCollsSync = this.syncColls
      .every((collName) => collName !== this.ALLOWED_COLLS.ALL)

    if (
      didNotAllCollsSync ||
      !(this._sessionAuth instanceof Map) ||
      this._sessionAuth.size === 0
    ) {
      return
    }

    const userIds = [...this._sessionAuth].reduce((accum, [key, val]) => {
      const { _id, isSyncOnStartupRequired } = val ?? {}

      if (isSyncOnStartupRequired) {
        accum.push(_id)
      }

      return accum
    }, [])

    if (userIds.length === 0) {
      return
    }

    await this.dao.updateCollBy(
      this.TABLES_NAMES.USERS,
      { $in: { _id: userIds } },
      { isSyncOnStartupRequired: 0 },
      opts
    )
  }

  _addAfterAllInsertsHooks (hook, opts) {
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
      hook.init({
        syncColls: this.syncColls,
        syncQueueId: this.syncQueueId,
        ...opts
      })
    })

    this._afterAllInsertsHooks.push(...hookArr)
  }

  _getDataFromApi (
    methodApi,
    args,
    shouldNotApiMiddlewareBeLaunched
  ) {
    if (!this.apiMiddleware.hasMethod(methodApi)) {
      throw new FindMethodError()
    }

    return this.getDataFromApi({
      getData: methodApi,
      args,
      middleware: this.apiMiddleware.request.bind(this.apiMiddleware),
      middlewareParams: { shouldNotApiMiddlewareBeLaunched },
      callerName: 'DATA_SYNCER'
    })
  }

  async _setProgress (progress) {
    for (const handler of this._asyncProgressHandlers) {
      await handler(progress)
    }

    this.emit('progress', progress)
  }

  async _optimizeDb () {
    if (typeof this.dao.optimize !== 'function') {
      return
    }

    await this.wsEventEmitter
      .emitSyncingStep('DB_OPTIMIZATION')
    await this.dao.optimize()
  }

  _getUserIds (auth) {
    const {
      _id: userId,
      subUser
    } = auth ?? {}
    const { _id: subUserId } = subUser ?? {}

    return { userId, subUserId }
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
}

decorateInjectable(DataInserter, depsTypes)

module.exports = DataInserter
