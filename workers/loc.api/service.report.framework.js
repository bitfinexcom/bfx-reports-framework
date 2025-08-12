'use strict'

const {
  omit,
  isEmpty
} = require('lib-js-util-base')
const {
  AuthError,
  BadRequestError
} = require('bfx-report/workers/loc.api/errors')
const {
  getTimezoneConf,
  isENetError,
  prepareSymbolResponse
} = require('bfx-report/workers/loc.api/helpers')

const ReportService = require('./service.report')
const {
  ServerAvailabilityError
} = require('./errors')
const {
  checkParams,
  checkParamsAuth,
  isNotSyncRequired,
  collObjToArr,
  getAuthFromSubAccountAuth,
  sumObjectsNumbers,
  pickAllLowerObjectsNumbers,
  sumArrayVolumes,
  pickLowerObjectsNumbers
} = require('./helpers')

const SYNC_PROGRESS_STATES = require('./sync/progress/sync.progress.states')

class FrameworkReportService extends ReportService {
  /**
   * @override
   */
  async _initialize (db) {
    await super._initialize()

    await this._databaseInitialize(db)
  }

  async _databaseInitialize (db) {
    await this._dao.databaseInitialize(db)
    await this._progress.setProgress(SYNC_PROGRESS_STATES.INITIAL_PROGRESS)
    await this._dao.updateRecordOf(
      this._TABLES_NAMES.SYNC_MODE,
      { isEnable: true }
    )
    await this._dao.updateRecordOf(
      this._TABLES_NAMES.SCHEDULER,
      { isEnable: true }
    )
    await this._dao.updateCollBy(
      this._TABLES_NAMES.SYNC_QUEUE,
      { state: this._SYNC_QUEUE_STATES.LOCKED_JOB_STATE },
      { state: this._SYNC_QUEUE_STATES.NEW_JOB_STATE }
    )
  }

  async _checkAuthInApi (args) {
    checkParamsAuth(args)

    const auth = getAuthFromSubAccountAuth(args?.auth ?? {})

    const {
      email,
      timezone,
      username,
      id,
      isUserMerchant
    } = await super.verifyUser(null, { ...args, auth })

    if (!email) {
      throw new AuthError()
    }

    return {
      email,
      timezone,
      username,
      id,
      isUserMerchant
    }
  }

  loginToBFX (space, args, cb) {
    return this._responder(() => {
      return this._httpRequest.getRequest()
        .login(args?.params)
    }, 'loginToBFX', args, cb)
  }

  verifyOnBFX (space, args, cb) {
    return this._responder(() => {
      return this._httpRequest.getRequest()
        .verify(args?.params)
    }, 'verifyOnBFX', args, cb)
  }

  isStagingBfxApi (space, args, cb) {
    return this._responder(() => {
      return this._authenticator.isStagingBfxApi()
    }, 'isStagingBfxApi', args, cb)
  }

  getLastFinishedSyncMts (space, args, cb) {
    return this._privResponder(async () => {
      const lastFinishedSyncQueueJob = await this._dao
        .getLastFinishedSyncQueueJob(args?.auth?._id)

      return {
        lastSyncMts: lastFinishedSyncQueueJob?.updatedAt ?? null
      }
    }, 'getLastFinishedSyncMts', args, cb)
  }

  signUp (space, args, cb) {
    return this._responder(() => {
      return this._authenticator.signUp(args)
    }, 'signUp', args, cb)
  }

  signIn (space, args, cb) {
    return this._responder(async () => {
      const {
        _id,
        email,
        isSubAccount,
        token,
        shouldNotSyncOnStartupAfterUpdate,
        isSyncOnStartupRequired,
        authTokenTTLSec,
        localUsername,
        isStagingBfxApi,
        isUserMerchant
      } = await this._authenticator.signIn(
        args,
        { isReturnedUser: true, doNotQueueQuery: true }
      )

      if (
        !shouldNotSyncOnStartupAfterUpdate &&
        isSyncOnStartupRequired
      ) {
        try {
          await this._sync.start({
            syncColls: this._ALLOWED_COLLS.ALL,
            isSolveAfterRedirToApi: true,
            ownerUserId: _id
          })
        } catch (err) {
          // If internet connection is not available provide ability to sign in
          if (!(err instanceof ServerAvailabilityError)) {
            throw err
          }
        }
      }

      const lastFinishedSyncQueueJob = await this._dao
        .getLastFinishedSyncQueueJob(_id)

      return {
        email,
        isSubAccount,
        token,
        shouldNotSyncOnStartupAfterUpdate,
        authTokenTTLSec,
        localUsername,
        lastSyncMts: lastFinishedSyncQueueJob?.updatedAt ?? null,
        isStagingBfxApi,
        isUserMerchant
      }
    }, 'signIn', args, cb)
  }

  signOut (space, args, cb) {
    return this._responder(() => {
      return this._authenticator.signOut(args)
    }, 'signOut', args, cb)
  }

  recoverPassword (space, args, cb) {
    return this._responder(() => {
      const { auth } = { ...args }
      const { isSubAccount } = { ...auth }

      if (isSubAccount) {
        return this._subAccount.recoverPassword(args)
      }

      return this._authenticator.recoverPassword(args)
    }, 'recoverPassword', args, cb)
  }

  verifyUser (space, args, cb) {
    return this._responder(() => {
      return this._authenticator.verifyUser(
        args,
        {
          isFilledSubUsers: true,
          isAppliedProjectionToSubUser: true,
          projection: [
            'username',
            'timezone',
            'isUserMerchant',
            'email',
            'id',
            'isSubAccount',
            'subUsers',
            '_id'
          ]
        }
      )
    }, 'verifyUser', args, cb)
  }

  getUsers (space, args, cb) {
    return this._responder(async () => {
      return this._authenticator.getUsers(
        { isSubUser: false },
        {
          isFilledSubUsers: true,
          isAppliedProjectionToSubUser: true,
          subUsersProjection: ['email'],
          projection: [
            'email',
            'localUsername',
            'isSubAccount',
            'isNotProtected',
            'subUsers',
            'isRestrictedToBeAddedToSubAccount',
            'isApiKeysAuth',
            'isStagingBfxApi'
          ]
        }
      )
    }, 'getUsers', args, cb)
  }

  removeUser (space, args, cb) {
    return this._responder(() => {
      return this._authenticator.removeUser(args)
    }, 'removeUser', args, cb)
  }

  updateUser (space, args, cb) {
    return this._responder(() => {
      return this._authenticator.updateUser(args)
    }, 'updateUser', args, cb)
  }

  createSubAccount (space, args, cb) {
    return this._responder(() => {
      this._dataValidator.validate(
        args,
        this._dataValidator.SCHEMA_IDS.CREATE_SUB_ACCOUNT_REQ
      )

      return this._subAccount
        .createSubAccount(args)
    }, 'createSubAccount', args, cb)
  }

  updateSubAccount (space, args, cb) {
    return this._responder(() => {
      this._dataValidator.validate(
        args,
        this._dataValidator.SCHEMA_IDS.UPDATE_SUB_ACCOUNT_REQ
      )

      return this._subAccount
        .updateSubAccount(args)
    }, 'updateSubAccount', args, cb)
  }

  getPlatformStatus (space, args, cb) {
    return this._responder(async () => {
      const rest = this._getREST({}, {
        interrupter: args?.interrupter
      })

      const res = await rest.status()
      const isMaintenance = !Array.isArray(res) || !res[0]

      return { isMaintenance }
    }, 'getPlatformStatus', args, cb)
  }

  pingApi (space, args, cb) {
    return this._responder(async () => {
      try {
        const { pingMethod = 'getPlatformStatus' } = args ?? {}
        const _args = omit(args, ['pingMethod'])

        if (typeof this[pingMethod] !== 'function') {
          throw new BadRequestError()
        }

        const res = await this[pingMethod](_args)

        if (pingMethod !== 'getPlatformStatus') {
          return true
        }
        if (!cb && res?.isMaintenance) {
          await this._wsEventEmitterFactory()
            .emitMaintenanceTurnedOn()

          throw new ServerAvailabilityError(this._conf.restUrl)
        }

        return !res?.isMaintenance
      } catch (err) {
        const isServerUnavailable = isENetError(err)

        const _err = isServerUnavailable
          ? new ServerAvailabilityError(this._conf.restUrl)
          : err

        if (cb && isServerUnavailable) {
          return false
        }

        throw _err
      }
    }, 'pingApi', args, cb)
  }

  enableSyncMode (space, args, cb) {
    return this._responder(async () => {
      const user = await this._authenticator.signIn(
        args,
        {
          active: null,
          isDataFromDb: true,
          isReturnedUser: true
        }
      )
      await this._dao.updateRecordOf(
        this._TABLES_NAMES.SYNC_MODE,
        { isEnable: true }
      )

      if (isNotSyncRequired(args)) {
        return true
      }

      await this._sync.start({
        isSolveAfterRedirToApi: true,
        ownerUserId: user?._id
      })

      return true
    }, 'enableSyncMode', args, cb)
  }

  disableSyncMode (space, args, cb) {
    return this._responder(async () => {
      await this._authenticator.signIn(
        args,
        {
          active: null,
          isDataFromDb: false,
          isReturnedUser: true
        }
      )

      return true
    }, 'disableSyncMode', args, cb)
  }

  isSyncModeWithDbData (space, args, cb) {
    const { auth } = { ...args }
    const { _id } = { ...auth }
    const isRequiredUser = (cb || !Number.isInteger(_id))
    const responder = isRequiredUser
      ? this._privResponder
      : this._responder

    return responder(async () => {
      const { auth } = { ...args }
      const { isDataFromDb } = { ...auth }

      const firstElem = await this._dao.getElemInCollBy(
        this._TABLES_NAMES.SYNC_MODE
      )

      return (
        !isEmpty(firstElem) &&
        !!firstElem.isEnable &&
        isDataFromDb
      )
    }, 'isSyncModeWithDbData', args, cb)
  }

  enableScheduler (space, args, cb) {
    return this._privResponder(async () => {
      await this._dao.updateRecordOf(
        this._TABLES_NAMES.SCHEDULER,
        { isEnable: true }
      )

      if (isNotSyncRequired(args)) {
        return true
      }

      await this._sync.start({
        isSolveAfterRedirToApi: true,
        ownerUserId: args?.auth?._id
      })

      return true
    }, 'enableScheduler', args, cb)
  }

  disableScheduler (space, args, cb) {
    return this._privResponder(async () => {
      await this._dao.updateRecordOf(
        this._TABLES_NAMES.SCHEDULER,
        { isEnable: false }
      )

      return true
    }, 'disableScheduler', args, cb)
  }

  isSchedulerEnabled (space, args, cb) {
    return this._responder(async () => {
      try {
        const firstElem = await this._dao.getElemInCollBy(
          this._TABLES_NAMES.SCHEDULER,
          { isEnable: 1 }
        )

        return !isEmpty(firstElem)
      } catch (err) {
        return false
      }
    }, 'isSchedulerEnabled', args, cb)
  }

  getSyncProgress (space, args, cb) {
    return this._privResponder(async () => {
      const { auth } = { ...args }
      const { isDataFromDb } = { ...auth }
      const isSchedulerEnabled = await this.isSchedulerEnabled()

      return (
        isDataFromDb &&
        isSchedulerEnabled
      )
        ? this._progress.getProgress()
        : {
            error: null,
            progress: null,
            state: null,
            isSyncInProgress: false,
            syncStartedAt: null,
            spentTime: null,
            leftTime: null
          }
    }, 'getSyncProgress', args, cb)
  }

  haveCollsBeenSyncedAtLeastOnce (space, args, cb) {
    return this._privResponder(() => {
      return this._syncCollsManager
        .haveCollsBeenSyncedAtLeastOnce(args)
    }, 'haveCollsBeenSyncedAtLeastOnce', args, cb)
  }

  syncNow (space, args = {}, cb) {
    return this._privResponder(() => {
      return this._sync.start({
        syncColls: args?.params?.syncColls ?? this._ALLOWED_COLLS.ALL,
        isSolveAfterRedirToApi: true,
        ownerUserId: args?.auth?._id
      })
    }, 'syncNow', args, cb)
  }

  stopSyncNow (space, args, cb) {
    return this._privResponder(() => {
      return this._sync.stop()
    }, 'stopSyncNow', args, cb)
  }

  interruptOperations (space, args = {}, cb) {
    return this._privResponder(() => {
      checkParams(args, 'paramsSchemaForInterruptOperations', ['names'])

      return this._authenticator.interruptOperations(args)
    }, 'interruptOperations', args, cb)
  }

  editAllPublicCollsConfs (space, args = {}, cb) {
    return this._privResponder(async () => {
      checkParams(args, 'paramsSchemaForEditAllPublicCollsConfs')

      const syncedColls = await this._publicCollsConfAccessors
        .editAllPublicCollsConfs(args)

      if (isNotSyncRequired(args)) {
        return true
      }

      await this._sync.start({
        syncColls: syncedColls,
        isSolveAfterRedirToApi: true,
        ownerUserId: args?.auth?._id
      })

      return true
    }, 'editAllPublicCollsConfs', args, cb)
  }

  getAllPublicCollsConfs (space, args = {}, cb) {
    return this._privResponder(() => {
      return this._publicCollsConfAccessors
        .getAllPublicCollsConfs(args)
    }, 'getAllPublicCollsConfs', args, cb)
  }

  /**
   * @override
   */
  getUsersTimeConf (space, args, cb) {
    return this._privResponder(async () => {
      const { auth: _auth } = { ...args }
      const { timezone } = { ..._auth }

      if (!await this.isSyncModeWithDbData(space, args)) {
        const auth = getAuthFromSubAccountAuth(_auth)

        return super.getUsersTimeConf(space, { ...args, auth })
      }

      return getTimezoneConf(timezone)
    }, 'getUsersTimeConf', args, cb)
  }

  /**
   * @override
   */
  getSymbols (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return super.getSymbols(space, args)
      }

      const methods = [
        this._SYNC_API_METHODS.SYMBOLS,
        this._SYNC_API_METHODS.FUTURES,
        this._SYNC_API_METHODS.CURRENCIES,
        this._SYNC_API_METHODS.INACTIVE_SYMBOLS,
        this._SYNC_API_METHODS.MAP_SYMBOLS,
        this._SYNC_API_METHODS.INACTIVE_CURRENCIES,
        this._SYNC_API_METHODS.MARGIN_CURRENCY_LIST
      ]
      const promises = methods.map(async (method) => {
        const res = await this._dao.findInCollBy(
          method,
          args,
          { isPublic: true }
        )

        const collSchema = this._syncSchema.getMethodCollMap()
          .get(method)
        const projection = collSchema.getModelField('PROJECTION')
        const type = collSchema.getModelField('TYPE')

        return collObjToArr(res, { projection, type })
      })

      const arrRes = await Promise.all(promises)

      if (arrRes.some(isEmpty)) {
        return super.getSymbols(space, args)
      }

      const [
        symbols,
        futures,
        currencies,
        inactiveSymbols,
        mapSymbols,
        inactiveCurrencies,
        marginCurrencyList
      ] = arrRes

      const res = prepareSymbolResponse({
        symbols,
        futures,
        currencies,
        inactiveSymbols,
        mapSymbols,
        inactiveCurrencies,
        marginCurrencyList
      })

      return res
    }, 'getSymbols', args, cb)
  }

  /**
   * @override
   */
  getPositionsHistory (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getPositionsHistory(space, args),
            args,
            { datePropName: 'mtsUpdate' }
          )
      }

      return this._dao.findInCollBy(
        this._SYNC_API_METHODS.POSITIONS_HISTORY,
        args,
        { isPrepareResponse: true, shouldParamsBeVerified: true }
      )
    }, 'getPositionsHistory', args, cb)
  }

  /**
   * @override
   */
  getActivePositions (space, args, cb) {
    return this._privResponder(() => {
      return this._subAccountApiData
        .getDataForSubAccount(
          (args) => this._getDataFromApi({
            getData: (space, args) => super.getActivePositions(space, args),
            args,
            callerName: 'ACTIVE_POSITIONS_GETTER',
            shouldNotInterrupt: true
          }),
          args,
          {
            datePropName: 'mtsUpdate',
            isNotPreparedResponse: true
          }
        )
    }, 'getActivePositions', args, cb)
  }

  /**
   * @override
   */
  getPositionsAudit (space, args, cb) {
    const { apiKey, apiSecret, authToken } = args?.auth ?? {}
    const isRequiredUser = (
      cb ||
      (
        (
          !apiKey ||
          typeof apiKey !== 'string' ||
          !apiSecret ||
          typeof apiSecret !== 'string'
        ) &&
        !authToken
      )
    )
    const responder = isRequiredUser
      ? this._privResponder
      : this._responder

    return responder(async () => {
      return this._positionsAudit
        .getPositionsAuditForSubAccount(
          (args) => this._getDataFromApi({
            getData: (space, args) => {
              return super.getPositionsAudit(space, args)
            },
            args,
            callerName: 'POSITIONS_AUDIT_GETTER',
            shouldNotInterrupt: true
          }),
          args,
          {
            checkParamsFn: (args) => this._dataValidator.validate(
              args,
              this._dataValidator.SCHEMA_IDS.GET_POSITIONS_AUDIT_REQ
            )
          }
        )
    }, 'getPositionsAudit', args, cb)
  }

  /**
   * @override
   */
  getLedgers (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getLedgers(space, args),
            args,
            { datePropName: 'mts' }
          )
      }

      return this._dao.findInCollBy(
        this._SYNC_API_METHODS.LEDGERS,
        args,
        { isPrepareResponse: true, shouldParamsBeVerified: true }
      )
    }, 'getLedgers', args, cb)
  }

  /**
   * @override
   */
  getPayInvoiceList (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getPayInvoiceList(space, args),
            args,
            { datePropName: 't' }
          )
      }

      return this._dao.findInCollBy(
        this._SYNC_API_METHODS.PAY_INVOICE_LIST,
        args,
        { isPrepareResponse: true, shouldParamsBeVerified: true }
      )
    }, 'getPayInvoiceList', args, cb)
  }

  /**
   * @override
   */
  getTrades (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getTrades(space, args),
            args,
            { datePropName: 'mtsCreate' }
          )
      }

      return this._dao.findInCollBy(
        this._SYNC_API_METHODS.TRADES,
        args,
        { isPrepareResponse: true, shouldParamsBeVerified: true }
      )
    }, 'getTrades', args, cb)
  }

  /**
   * @override
   */
  getFundingTrades (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getFundingTrades(space, args),
            args,
            { datePropName: 'mtsCreate' }
          )
      }

      return this._dao.findInCollBy(
        this._SYNC_API_METHODS.FUNDING_TRADES,
        args,
        { isPrepareResponse: true, shouldParamsBeVerified: true }
      )
    }, 'getFundingTrades', args, cb)
  }

  /**
   * @override
   */
  getTickersHistory (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return super.getTickersHistory(space, args)
      }

      return this._publicCollsConfAccessors
        .getPublicData(
          (args) => super.getTickersHistory(space, args),
          args,
          {
            collName: this._SYNC_API_METHODS.TICKERS_HISTORY,
            confName: this._PUBLIC_COLLS_CONF_NAMES.TICKERS_HISTORY_CONF,
            datePropName: 'mtsUpdate'
          }
        )
    }, 'getTickersHistory', args, cb)
  }

  /**
   * @override
   */
  getPublicTrades (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return super.getPublicTrades(space, args)
      }

      return this._publicCollsConfAccessors
        .getPublicData(
          (args) => super.getPublicTrades(space, args),
          args,
          {
            collName: this._SYNC_API_METHODS.PUBLIC_TRADES,
            confName: this._PUBLIC_COLLS_CONF_NAMES.PUBLIC_TRADES_CONF,
            datePropName: 'mts'
          }
        )
    }, 'getPublicTrades', args, cb)
  }

  /**
   * @override
   */
  getStatusMessages (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return super.getStatusMessages(space, args)
      }

      const { params } = { ...args }
      const {
        type = 'deriv',
        symbol = ['ALL']
      } = { ...params }
      const preparedArgs = {
        ...args,
        params: {
          ...params,
          type,
          symbol: (
            symbol === 'ALL' ||
            (
              Array.isArray(symbol) &&
              symbol[0] === 'ALL'
            )
          )
            ? undefined
            : symbol
        }
      }

      return this._publicCollsConfAccessors
        .getPublicData(
          (args) => super.getStatusMessages(space, args),
          preparedArgs,
          {
            collName: this._SYNC_API_METHODS.STATUS_MESSAGES,
            confName: this._PUBLIC_COLLS_CONF_NAMES.STATUS_MESSAGES_CONF,
            datePropName: 'timestamp'
          }
        )
    }, 'getStatusMessages', args, cb)
  }

  /**
   * @override
   */
  getCandles (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return super.getCandles(space, args)
      }

      this._dataValidator.validate(
        args,
        this._dataValidator.SCHEMA_IDS.FW_GET_CANDLES_REQ
      )

      const { params } = args ?? {}
      const {
        section = 'hist',
        timeframe = '1D'
      } = params ?? {}
      const argsWithParamsByDefault = {
        ...args,
        params: {
          ...params,
          section,
          timeframe
        }
      }

      return this._publicCollsConfAccessors
        .getPublicData(
          (args) => super.getCandles(space, args),
          argsWithParamsByDefault,
          {
            collName: this._SYNC_API_METHODS.CANDLES,
            confName: this._PUBLIC_COLLS_CONF_NAMES.CANDLES_CONF,
            datePropName: 'mts'
          }
        )
    }, 'getCandles', args, cb)
  }

  /**
   * @override
   */
  getOrderTrades (space, args, cb) {
    return this._privResponder(() => {
      return this._orderTrades.getOrderTrades(
        (args) => super.getOrderTrades(space, args),
        args,
        {
          checkParamsFn: (args) => this._dataValidator.validate(
            args,
            this._dataValidator.SCHEMA_IDS.GET_ORDER_TRADES_REQ
          )
        }
      )
    }, 'getOrderTrades', args, cb)
  }

  /**
   * @override
   */
  getOrders (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getOrders(space, args),
            args,
            { datePropName: 'mtsUpdate' }
          )
      }

      return this._dao.findInCollBy(
        this._SYNC_API_METHODS.ORDERS,
        args,
        { isPrepareResponse: true, shouldParamsBeVerified: true }
      )
    }, 'getOrders', args, cb)
  }

  /**
   * @override
   */
  getActiveOrders (space, args, cb) {
    return this._privResponder(() => {
      return this._subAccountApiData
        .getDataForSubAccount(
          (args) => super.getActiveOrders(space, args),
          args,
          {
            datePropName: 'mtsUpdate',
            isNotPreparedResponse: true
          }
        )
    }, 'getActiveOrders', args, cb)
  }

  /**
   * @override
   */
  getMovements (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getMovements(space, args),
            args,
            { datePropName: 'mtsUpdated' }
          )
      }

      return this._dao.findInCollBy(
        this._SYNC_API_METHODS.MOVEMENTS,
        args,
        { isPrepareResponse: true, shouldParamsBeVerified: true }
      )
    }, 'getMovements', args, cb)
  }

  /**
   * @override
   */
  getMovementInfo (space, args, cb) {
    return this._privResponder(async () => {
      const res = await this._subAccountApiData
        .getDataForSubAccount(
          (args) => super.getMovementInfo(space, args),
          args,
          {
            datePropName: 'mtsUpdated',
            isNotPreparedResponse: true
          }
        )

      return Array.isArray(res)
        ? res.filter((sRes) => Number.isInteger(sRes?.id))[0] ?? {}
        : res
    }, 'getMovementInfo', args, cb)
  }

  /**
   * @override
   */
  getFundingOfferHistory (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getFundingOfferHistory(space, args),
            args,
            { datePropName: 'mtsUpdate' }
          )
      }

      return this._dao.findInCollBy(
        this._SYNC_API_METHODS.FUNDING_OFFER_HISTORY,
        args,
        { isPrepareResponse: true, shouldParamsBeVerified: true }
      )
    }, 'getFundingOfferHistory', args, cb)
  }

  /**
   * @override
   */
  getFundingLoanHistory (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getFundingLoanHistory(space, args),
            args,
            { datePropName: 'mtsUpdate' }
          )
      }

      return this._dao.findInCollBy(
        this._SYNC_API_METHODS.FUNDING_LOAN_HISTORY,
        args,
        { isPrepareResponse: true, shouldParamsBeVerified: true }
      )
    }, 'getFundingLoanHistory', args, cb)
  }

  /**
   * @override
   */
  getFundingCreditHistory (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getFundingCreditHistory(space, args),
            args,
            { datePropName: 'mtsUpdate' }
          )
      }

      return this._dao.findInCollBy(
        this._SYNC_API_METHODS.FUNDING_CREDIT_HISTORY,
        args,
        { isPrepareResponse: true, shouldParamsBeVerified: true }
      )
    }, 'getFundingCreditHistory', args, cb)
  }

  /**
   * @override
   */
  getLogins (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getLogins(space, args),
            args,
            { datePropName: 'time' }
          )
      }

      return this._dao.findInCollBy(
        this._SYNC_API_METHODS.LOGINS,
        args,
        { isPrepareResponse: true, shouldParamsBeVerified: true }
      )
    }, 'getLogins', args, cb)
  }

  /**
   * @override
   */
  getChangeLogs (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getChangeLogs(space, args),
            args,
            { datePropName: 'mtsCreate' }
          )
      }

      return this._dao.findInCollBy(
        this._SYNC_API_METHODS.CHANGE_LOGS,
        args,
        { isPrepareResponse: true, shouldParamsBeVerified: true }
      )
    }, 'getChangeLogs', args, cb)
  }

  /**
   * @override
   */
  getAccountSummary (space, args, cb) {
    return this._privResponder(async () => {
      const arrRes = await this._subAccountApiData
        .getDataForSubAccount(
          async (args) => {
            const res = await super.getAccountSummary(space, args)

            return Array.isArray(res) ? res : [res]
          },
          args,
          {
            datePropName: 'time',
            isNotPreparedResponse: true
          }
        )

      const objRes = {
        trade_vol_30d: sumArrayVolumes(
          'trade_vol_30d', arrRes),
        fees_trading_30d: pickAllLowerObjectsNumbers(
          'fees_trading_30d', arrRes),
        fees_trading_total_30d: pickLowerObjectsNumbers(
          'fees_trading_total_30d', arrRes),
        fees_funding_30d: pickAllLowerObjectsNumbers(
          'fees_funding_30d', arrRes),
        fees_funding_total_30d: pickLowerObjectsNumbers(
          'fees_funding_total_30d', arrRes),
        makerFee: pickLowerObjectsNumbers(
          'makerFee', arrRes),
        derivMakerRebate: pickLowerObjectsNumbers(
          'derivMakerRebate', arrRes),
        takerFeeToCrypto: pickLowerObjectsNumbers(
          'takerFeeToCrypto', arrRes),
        takerFeeToStable: pickLowerObjectsNumbers(
          'takerFeeToStable', arrRes),
        takerFeeToFiat: pickLowerObjectsNumbers(
          'takerFeeToFiat', arrRes),
        derivTakerFee: pickLowerObjectsNumbers(
          'derivTakerFee', arrRes),
        leoLev: sumObjectsNumbers(
          'leoLev', arrRes),
        leoAmountAvg: sumObjectsNumbers(
          'leoAmountAvg', arrRes)
      }

      return [objRes]
    }, 'getAccountSummary', args, cb)
  }

  /**
   * @override
   */
  getSettings (space, args, cb) {
    return this._privResponder(async () => {
      const {
        apiKey,
        apiSecret,
        authToken,
        subUsers
      } = args?.auth ?? {}

      if (
        Array.isArray(subUsers) &&
        subUsers.length > 1
      ) {
        const promises = subUsers.map((subUser) => {
          const { apiKey, apiSecret, authToken } = subUser ?? {}

          const _args = {
            ...args,
            auth: { apiKey, apiSecret, authToken }
          }

          return super.getSettings(space, _args)
        })
        const resArr = await Promise.all(promises)

        return resArr.reduce((accum, curr) => {
          if (Array.isArray(curr)) {
            accum.push(...curr)
          }

          return accum
        }, [])
      }

      const _args = {
        ...args,
        auth: getAuthFromSubAccountAuth(
          { apiKey, apiSecret, authToken }
        )
      }

      return super.getSettings(space, _args)
    }, 'getSettings', args, cb)
  }

  /**
   * @override
   */
  updateSettings (space, args, cb) {
    return this._privResponder(async () => {
      const { apiKey, apiSecret, authToken } = args?.auth ?? {}
      const _args = {
        ...args,
        auth: getAuthFromSubAccountAuth(
          { apiKey, apiSecret, authToken }
        )
      }

      return super.updateSettings(space, _args)
    }, 'updateSettings', args, cb)
  }

  /**
   * @override
   */
  getWallets (space, args, cb) {
    return this._privResponder(async () => {
      await this._dataConsistencyChecker
        .check(this._CHECKER_NAMES.WALLETS, args)

      this._dataValidator.validate(
        args,
        this._dataValidator.SCHEMA_IDS.GET_WALLETS_REQ
      )

      return this._wallets.getWallets(args)
    }, 'getWallets', args, cb)
  }

  getBalanceHistory (space, args, cb) {
    return this._privResponder(async () => {
      await this._dataConsistencyChecker
        .check(this._CHECKER_NAMES.BALANCE_HISTORY, args)

      this._dataValidator.validate(
        args,
        this._dataValidator.SCHEMA_IDS.GET_BALANCE_HISTORY_REQ
      )

      return this._balanceHistory.getBalanceHistory(args)
    }, 'getBalanceHistory', args, cb)
  }

  getWinLoss (space, args, cb) {
    return this._privResponder(async () => {
      await this._dataConsistencyChecker
        .check(this._CHECKER_NAMES.WIN_LOSS, args)

      checkParams(args, 'paramsSchemaForWinLossApi')

      return this._winLoss.getWinLoss(args)
    }, 'getWinLoss', args, cb)
  }

  getPositionsSnapshot (space, args, cb) {
    return this._privResponder(async () => {
      await this._dataConsistencyChecker
        .check(this._CHECKER_NAMES.POSITIONS_SNAPSHOT, args)

      checkParams(args, 'paramsSchemaForPositionsSnapshotApi')

      return this._positionsSnapshot.getPositionsSnapshot(args)
    }, 'getPositionsSnapshot', args, cb)
  }

  getFullSnapshotReport (space, args, cb) {
    return this._privResponder(async () => {
      await this._dataConsistencyChecker
        .check(this._CHECKER_NAMES.FULL_SNAPSHOT_REPORT, args)

      checkParams(args, 'paramsSchemaForFullSnapshotReportApi')

      return this._fullSnapshotReport.getFullSnapshotReport(args)
    }, 'getFullSnapshotReport', args, cb)
  }

  getFullTaxReport (space, args, cb) {
    return this._privResponder(async () => {
      await this._dataConsistencyChecker
        .check(this._CHECKER_NAMES.FULL_TAX_REPORT, args)

      checkParams(args, 'paramsSchemaForFullTaxReportApi')

      return this._fullTaxReport.getFullTaxReport(args)
    }, 'getFullTaxReport', args, cb)
  }

  getTransactionTaxReport (space, args, cb) {
    return this._privResponder(async () => {
      await this._dataConsistencyChecker
        .check(this._CHECKER_NAMES.TRANSACTION_TAX_REPORT, args)

      checkParams(args, 'paramsSchemaForTransactionTaxReportApi')

      return this._transactionTaxReport.getTransactionTaxReport(args)
    }, 'getTransactionTaxReport', args, cb)
  }

  makeTrxTaxReportInBackground (space, args, cb) {
    return this._privResponder(async () => {
      await this._dataConsistencyChecker
        .check(this._CHECKER_NAMES.TRANSACTION_TAX_REPORT, args)

      checkParams(args, 'paramsSchemaForTransactionTaxReportApi')

      return this._transactionTaxReport.makeTrxTaxReportInBackground(args)
    }, 'makeTrxTaxReportInBackground', args, cb)
  }

  getTradedVolume (space, args, cb) {
    return this._privResponder(async () => {
      await this._dataConsistencyChecker
        .check(this._CHECKER_NAMES.TRADED_VOLUME, args)

      checkParams(args, 'paramsSchemaForTradedVolumeApi')

      return this._tradedVolume.getTradedVolume(args)
    }, 'getTradedVolume', args, cb)
  }

  getTotalFeesReport (space, args, cb) {
    return this._privResponder(async () => {
      await this._dataConsistencyChecker
        .check(this._CHECKER_NAMES.TOTAL_FEES_REPORT, args)

      checkParams(args, 'paramsSchemaForTotalFeesReportApi')

      return this._totalFeesReport.getTotalFeesReport(args)
    }, 'getTotalFeesReport', args, cb)
  }

  getPerformingLoan (space, args, cb) {
    return this._privResponder(async () => {
      await this._dataConsistencyChecker
        .check(this._CHECKER_NAMES.PERFORMING_LOAN, args)

      checkParams(args, 'paramsSchemaForPerformingLoanApi')

      return this._performingLoan.getPerformingLoan(args)
    }, 'getPerformingLoan', args, cb)
  }

  getWinLossVSAccountBalance (space, args, cb) {
    return this._privResponder(async () => {
      await this._dataConsistencyChecker
        .check(this._CHECKER_NAMES.WIN_LOSS, args)

      checkParams(args, 'paramsSchemaForWinLossVSAccountBalanceApi')

      return this._winLossVSAccountBalance
        .getWinLossVSAccountBalance(args)
    }, 'getWinLossVSAccountBalance', args, cb)
  }

  getSummaryByAsset (space, args, cb) {
    return this._privResponder(async () => {
      await this._dataConsistencyChecker
        .check(this._CHECKER_NAMES.SUMMARY_BY_ASSET, args)

      checkParams(args, 'paramsSchemaForSummaryByAssetApi')

      return this._summaryByAsset.getSummaryByAsset(args)
    }, 'getSummaryByAsset', args, cb)
  }

  /**
   * @override
   */
  getMultipleFile (space, args, cb) {
    return this._responder(() => {
      return this._generateReportFile(
        'getMultipleFileJobData',
        args
      )
    }, 'getMultipleFile', args, cb)
  }

  getBalanceHistoryFile (space, args, cb) {
    return this._responder(() => {
      return this._generateReportFile(
        'getBalanceHistoryFileJobData',
        args
      )
    }, 'getBalanceHistoryFile', args, cb)
  }

  getWinLossFile (space, args, cb) {
    return this._responder(() => {
      return this._generateReportFile(
        'getWinLossFileJobData',
        args
      )
    }, 'getWinLossFile', args, cb)
  }

  getPositionsSnapshotFile (space, args, cb) {
    return this._responder(() => {
      return this._generateReportFile(
        'getPositionsSnapshotFileJobData',
        args
      )
    }, 'getPositionsSnapshotFile', args, cb)
  }

  getFullSnapshotReportFile (space, args, cb) {
    return this._responder(() => {
      return this._generateReportFile(
        'getFullSnapshotReportFileJobData',
        args
      )
    }, 'getFullSnapshotReportFile', args, cb)
  }

  getFullTaxReportFile (space, args, cb) {
    return this._responder(() => {
      return this._generateReportFile(
        'getFullTaxReportFileJobData',
        args
      )
    }, 'getFullTaxReportFile', args, cb)
  }

  getTransactionTaxReportFile (space, args, cb) {
    return this._responder(() => {
      return this._generateReportFile(
        'getTransactionTaxReportFileJobData',
        args
      )
    }, 'getTransactionTaxReportFile', args, cb)
  }

  getTradedVolumeFile (space, args, cb) {
    return this._responder(() => {
      return this._generateReportFile(
        'getTradedVolumeFileJobData',
        args
      )
    }, 'getTradedVolumeFile', args, cb)
  }

  getTotalFeesReportFile (space, args, cb) {
    return this._responder(() => {
      return this._generateReportFile(
        'getTotalFeesReportFileJobData',
        args
      )
    }, 'getTotalFeesReportFile', args, cb)
  }

  getPerformingLoanFile (space, args, cb) {
    return this._responder(() => {
      return this._generateReportFile(
        'getPerformingLoanFileJobData',
        args
      )
    }, 'getPerformingLoanFile', args, cb)
  }

  getCandlesFile (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return super.getCandlesFile(space, args)
      }

      this._dataValidator.validate(
        args,
        this._dataValidator.SCHEMA_IDS.FW_GET_CANDLES_FILE_REQ
      )

      return super.getCandlesFile(space, args)
    }, 'getCandlesFile', args, cb)
  }

  getWinLossVSAccountBalanceFile (space, args, cb) {
    return this._responder(() => {
      return this._generateReportFile(
        'getWinLossVSAccountBalanceFileJobData',
        args
      )
    }, 'getWinLossVSAccountBalanceFile', args, cb)
  }
}

module.exports = FrameworkReportService
