'use strict'

const {
  omit,
  isEmpty
} = require('lodash')
const {
  AuthError,
  FindMethodError
} = require('bfx-report/workers/loc.api/errors')
const {
  getTimezoneConf,
  getDataFromApi
} = require('bfx-report/workers/loc.api/helpers')

const ReportService = require('./service.report')
const {
  ServerAvailabilityError,
  DuringSyncMethodAccessError
} = require('./errors')
const {
  checkParams,
  checkParamsAuth,
  isEnotfoundError,
  isEaiAgainError,
  collObjToArr,
  getAuthFromSubAccountAuth,
  isSubAccountApiKeys
} = require('./helpers')

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
    await this._dao.updateProgress('SYNCHRONIZATION_HAS_NOT_STARTED_YET')
    await this._dao.updateStateOf(this._TABLES_NAMES.SYNC_MODE, true)
    await this._dao.updateStateOf(this._TABLES_NAMES.SCHEDULER, true)
  }

  /**
   * @override
   */
  async _getUserInfo (args) {
    try {
      const user = await this._authenticator.verifyUser(
        args,
        {
          projection: [
            'username',
            'timezone',
            'email',
            'id'
          ]
        }
      )

      return user
    } catch (err) {
      return false
    }
  }

  async _checkAuthInApi (args) {
    checkParamsAuth(args)

    const { auth: _auth } = { ...args }
    const auth = getAuthFromSubAccountAuth(_auth)

    const {
      email,
      timezone,
      username,
      id
    } = await super._getUserInfo({ ...args, auth })

    if (!email) {
      throw new AuthError()
    }

    return {
      email,
      timezone,
      username,
      id
    }
  }

  signUp (space, args, cb) {
    return this._responder(() => {
      return this._authenticator.signUp(args)
    }, 'signUp', cb)
  }

  signIn (space, args, cb) {
    return this._responder(() => {
      return this._authenticator.signIn(args)
    }, 'signIn', cb)
  }

  signOut (space, args, cb) {
    return this._responder(() => {
      return this._authenticator.signOut(args)
    }, 'signOut', cb)
  }

  verifyUser (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeConfig(space, args)) {
        const { email } = await this._checkAuthInApi(args)
        const { auth } = { ...args }
        const isSubAccount = isSubAccountApiKeys(auth)

        return { email, isSubAccount }
      }

      return this._authenticator.verifyUser(
        args,
        { projection: ['email', 'isSubAccount'] }
      )
    }, 'verifyUser', cb)
  }

  getUsers (space, args, cb) {
    return this._responder(async () => {
      return this._authenticator.getUsers(
        { isSubUser: false },
        { projection: ['email', 'isSubAccount'] }
      )
    }, 'getUsers', cb)
  }

  removeUser (space, args, cb) {
    return this._responder(() => {
      return this._authenticator.removeUser(args)
    }, 'removeUser', cb)
  }

  createSubAccount (space, args, cb) {
    return this._responder(async () => {
      checkParams(args, 'paramsSchemaForCreateSubAccount')

      await this._subAccount
        .createSubAccount(args)

      return true
    }, 'createSubAccount', cb)
  }

  pingApi (space, args, cb) {
    return this._responder(async () => {
      try {
        const { pingMethod = '_getSymbols' } = { ...args }
        const _args = omit(args, ['pingMethod'])

        if (typeof this[pingMethod] !== 'function') {
          throw new FindMethodError()
        }

        await this[pingMethod](_args)

        return true
      } catch (err) {
        const isServerUnavailable = (
          isEnotfoundError(err) ||
          isEaiAgainError(err)
        )
        const _err = isServerUnavailable
          ? new ServerAvailabilityError(this._conf.restUrl)
          : err

        if (cb && isServerUnavailable) {
          return false
        }

        throw _err
      }
    }, 'pingApi', cb)
  }

  enableSyncMode (space, args, cb) {
    return this._responder(async () => {
      await this._authenticator.signIn(
        args,
        {
          active: null,
          isDataFromDb: true
        }
      )
      await this._dao.updateStateOf(this._TABLES_NAMES.SYNC_MODE, true)
      await this._sync.start(true)

      return true
    }, 'enableSyncMode', cb)
  }

  disableSyncMode (space, args, cb) {
    return this._responder(async () => {
      const auth = await this._authenticator.signIn(
        args,
        {
          active: null,
          isDataFromDb: false,
          isReturnedUser: true
        }
      )

      await this._wsEventEmitter.emitRedirectingRequestsStatusToApi(
        (user) => {
          if (this._wsEventEmitter.isInvalidAuth(auth, user)) {
            return null
          }

          return true
        }
      )

      return true
    }, 'disableSyncMode', cb)
  }

  /**
   * TODO:
   */
  isSyncModeWithDbData (space, args, cb) {
    return this._privResponder(async () => {
      const { auth } = { ...args }
      const { isDataFromDb } = { ...auth }

      const firstElem = await this._dao.getFirstElemInCollBy(
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
    return this._responder(async () => {
      await this._dao.checkAuthInDb(args)
      await this._dao.updateStateOf(this._TABLES_NAMES.SCHEDULER, true)

      return this.syncNow()
    }, 'enableScheduler', cb)
  }

  disableScheduler (space, args, cb) {
    return this._responder(async () => {
      await this._dao.checkAuthInDb(args)
      await this._dao.updateStateOf(this._TABLES_NAMES.SCHEDULER, false)

      return true
    }, 'disableScheduler', cb)
  }

  isSchedulerEnabled (space, args, cb) {
    return this._responder(async () => {
      try {
        const firstElem = await this._dao.getFirstElemInCollBy(
          this._TABLES_NAMES.SCHEDULER,
          { isEnable: 1 }
        )

        return !isEmpty(firstElem)
      } catch (err) {
        return false
      }
    }, 'isSchedulerEnabled', cb)
  }

  getSyncProgress (space, args, cb) {
    return this._responder(async () => {
      const user = await this._dao.checkAuthInDb(args, false)
      const isSchedulerEnabled = await this.isSchedulerEnabled()

      return (
        !isEmpty(user) &&
        user.isDataFromDb &&
        isSchedulerEnabled
      )
        ? this._progress.getProgress()
        : false
    }, 'getSyncProgress', cb)
  }

  syncNow (space, args = {}, cb) {
    return this._responder(async () => {
      if (cb) {
        await this._dao.checkAuthInDb(args)
      }

      const syncColls = (
        args &&
        typeof args === 'object' &&
        args.params &&
        typeof args.params === 'object' &&
        args.params.syncColls
      )
        ? args.params.syncColls
        : this._ALLOWED_COLLS.ALL

      return this._sync.start(true, syncColls)
    }, 'syncNow', cb)
  }

  getPublicTradesConf (space, args = {}, cb) {
    return this._responder(() => {
      return this._publicСollsСonfAccessors
        .getPublicСollsСonf('publicTradesConf', args)
    }, 'getPublicTradesConf', cb)
  }

  getTickersHistoryConf (space, args = {}, cb) {
    return this._responder(() => {
      return this._publicСollsСonfAccessors
        .getPublicСollsСonf('tickersHistoryConf', args)
    }, 'getTickersHistoryConf', cb)
  }

  getStatusMessagesConf (space, args = {}, cb) {
    return this._responder(() => {
      return this._publicСollsСonfAccessors
        .getPublicСollsСonf('statusMessagesConf', args)
    }, 'getStatusMessagesConf', cb)
  }

  getCandlesConf (space, args = {}, cb) {
    return this._responder(() => {
      return this._publicСollsСonfAccessors
        .getPublicСollsСonf('candlesConf', args)
    }, 'getCandlesConf', cb)
  }

  editPublicTradesConf (space, args = {}, cb) {
    return this._responder(async () => {
      checkParams(args, 'paramsSchemaForEditPublicСollsСonf')

      await this._publicСollsСonfAccessors
        .editPublicСollsСonf('publicTradesConf', args)
      await this._sync.start(true, this._ALLOWED_COLLS.PUBLIC_TRADES)

      return true
    }, 'editPublicTradesConf', cb)
  }

  editTickersHistoryConf (space, args = {}, cb) {
    return this._responder(async () => {
      checkParams(args, 'paramsSchemaForEditPublicСollsСonf')

      await this._publicСollsСonfAccessors
        .editPublicСollsСonf('tickersHistoryConf', args)
      await this._sync.start(true, this._ALLOWED_COLLS.TICKERS_HISTORY)

      return true
    }, 'editTickersHistoryConf', cb)
  }

  editStatusMessagesConf (space, args = {}, cb) {
    return this._responder(async () => {
      checkParams(args, 'paramsSchemaForEditPublicСollsСonf')

      await this._publicСollsСonfAccessors
        .editPublicСollsСonf('statusMessagesConf', args)
      await this._sync.start(true, this._ALLOWED_COLLS.STATUS_MESSAGES)

      return true
    }, 'editStatusMessagesConf', cb)
  }

  editCandlesConf (space, args = {}, cb) {
    return this._responder(async () => {
      checkParams(args, 'paramsSchemaForEditCandlesСonf')

      await this._publicСollsСonfAccessors
        .editPublicСollsСonf('candlesConf', args)
      await this._sync.start(true, this._ALLOWED_COLLS.CANDLES)

      return true
    }, 'editCandlesConf', cb)
  }

  editAllPublicСollsСonfs (space, args = {}, cb) {
    return this._responder(async () => {
      checkParams(args, 'paramsSchemaForEditAllPublicСollsСonfs')

      const syncedColls = await this._publicСollsСonfAccessors
        .editAllPublicСollsСonfs(args)
      await this._sync.start(true, syncedColls)

      return true
    }, 'editCandlesConf', cb)
  }

  getAllPublicСollsСonfs (space, args = {}, cb) {
    return this._responder(() => {
      return this._publicСollsСonfAccessors
        .getAllPublicСollsСonfs(args)
    }, 'editCandlesConf', cb)
  }

  /**
   * @override
   */
  getEmail (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        const { auth: _auth } = { ...args }
        const auth = getAuthFromSubAccountAuth(_auth)

        return super.getEmail(space, { ...args, auth })
      }

      const { email } = await this._dao.checkAuthInDb(args)

      return email
    }, 'getEmail', cb)
  }

  /**
   * @override
   */
  getUsersTimeConf (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        const { auth: _auth } = { ...args }
        const auth = getAuthFromSubAccountAuth(_auth)

        return super.getUsersTimeConf(space, { ...args, auth })
      }

      const { timezone } = await this._dao.checkAuthInDb(args)

      return getTimezoneConf(timezone)
    }, 'getUsersTimeConf', cb)
  }

  /**
   * @override
   */
  getSymbols (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return super.getSymbols(space, args)
      }

      checkParams(args, 'paramsSchemaForApi')

      const symbolsMethod = '_getSymbols'
      const futuresMethod = '_getFutures'
      const currenciesMethod = '_getCurrencies'
      const {
        field: symbolsField
      } = this._syncSchema.getMethodCollMap().get(symbolsMethod)
      const {
        field: futuresField
      } = this._syncSchema.getMethodCollMap().get(futuresMethod)
      const symbols = await this._dao.findInCollBy(
        symbolsMethod,
        args,
        { isPublic: true }
      )
      const futures = await this._dao.findInCollBy(
        futuresMethod,
        args,
        { isPublic: true }
      )
      const currencies = await this._dao.findInCollBy(
        currenciesMethod,
        args,
        { isPublic: true }
      )

      if (
        isEmpty(symbols) &&
        isEmpty(futures) &&
        isEmpty(currencies)
      ) {
        return super.getSymbols(space, args)
      }

      const symbolsArr = collObjToArr(symbols, symbolsField)
      const futuresArr = collObjToArr(futures, futuresField)
      const pairs = [...symbolsArr, ...futuresArr]

      return { pairs, currencies }
    }, 'getSymbols', cb)
  }

  /**
   * @override
   */
  getPositionsHistory (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getPositionsHistory(space, args),
            args,
            { datePropName: 'mtsUpdate' }
          )
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getPositionsHistory',
        args,
        { isPrepareResponse: true }
      )
    }, 'getPositionsHistory', cb)
  }

  /**
   * @override
   */
  getActivePositions (space, args, cb) {
    return this._responder(() => {
      return this._subAccountApiData
        .getDataForSubAccount(
          (args) => getDataFromApi(
            (space, args) => super.getActivePositions(space, args),
            args
          ),
          args,
          {
            datePropName: 'mtsUpdate',
            isNotPreparedResponse: true
          }
        )
    }, 'getActivePositions', cb)
  }

  /**
   * @override
   */
  getPositionsAudit (space, args, cb) {
    return this._responder(() => {
      return this._positionsAudit
        .getPositionsAuditForSubAccount(
          (args) => getDataFromApi(
            (space, args) => super.getPositionsAudit(space, args),
            args
          ),
          args,
          {
            checkParamsFn: (args) => checkParams(
              args, 'paramsSchemaForPositionsAudit'
            )
          }
        )
    }, 'getPositionsAudit', cb)
  }

  /**
   * TODO:
   *
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

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getLedgers',
        args,
        { isPrepareResponse: true }
      )
    }, 'getLedgers', args, cb)
  }

  /**
   * @override
   */
  getTrades (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getTrades(space, args),
            args,
            { datePropName: 'mtsCreate' }
          )
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getTrades',
        args,
        { isPrepareResponse: true }
      )
    }, 'getTrades', cb)
  }

  /**
   * @override
   */
  getFundingTrades (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getFundingTrades(space, args),
            args,
            { datePropName: 'mtsCreate' }
          )
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getFundingTrades',
        args,
        { isPrepareResponse: true }
      )
    }, 'getFundingTrades', cb)
  }

  /**
   * @override
   */
  getTickersHistory (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return super.getTickersHistory(space, args)
      }

      checkParams(args, 'paramsSchemaForApi', ['symbol'])

      return this._publicСollsСonfAccessors
        .getPublicData(
          (args) => super.getTickersHistory(space, args),
          args,
          {
            collName: '_getTickersHistory',
            confName: 'tickersHistoryConf',
            datePropName: 'mtsUpdate'
          }
        )
    }, 'getTickersHistory', cb)
  }

  /**
   * @override
   */
  getPublicTrades (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return super.getPublicTrades(space, args)
      }

      checkParams(args, 'paramsSchemaForPublicTrades', ['symbol'])

      return this._publicСollsСonfAccessors
        .getPublicData(
          (args) => super.getPublicTrades(space, args),
          args,
          {
            collName: '_getPublicTrades',
            confName: 'publicTradesConf',
            datePropName: 'mts'
          }
        )
    }, 'getPublicTrades', cb)
  }

  /**
   * @override
   */
  getStatusMessages (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return super.getStatusMessages(space, args)
      }

      checkParams(args, 'paramsSchemaForStatusMessagesApi')

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
            ? null
            : symbol
        }
      }

      return this._publicСollsСonfAccessors
        .getPublicData(
          (args) => super.getStatusMessages(space, args),
          preparedArgs,
          {
            collName: '_getStatusMessages',
            confName: 'statusMessagesConf',
            datePropName: 'timestamp'
          }
        )
    }, 'getStatusMessages', cb)
  }

  /**
   * @override
   */
  getCandles (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return super.getCandles(space, args)
      }

      checkParams(args, 'paramsSchemaForCandlesApi')

      const { params } = { ...args }
      const {
        section = 'hist',
        timeframe = '1D'
      } = { ...params }
      const argsWithParamsByDefault = {
        ...args,
        params: {
          ...params,
          section,
          timeframe
        }
      }

      return this._publicСollsСonfAccessors
        .getPublicData(
          (args) => super.getCandles(space, args),
          argsWithParamsByDefault,
          {
            collName: '_getCandles',
            confName: 'candlesConf',
            datePropName: 'mts'
          }
        )
    }, 'getCandles', cb)
  }

  /**
   * @override
   */
  getOrderTrades (space, args, cb) {
    return this._responder(() => {
      return this._orderTrades.getOrderTrades(
        (args) => super.getOrderTrades(space, args),
        args,
        {
          checkParamsFn: (args) => checkParams(
            args, 'paramsSchemaForOrderTradesApi'
          )
        }
      )
    }, 'getOrderTrades', cb)
  }

  /**
   * @override
   */
  getOrders (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getOrders(space, args),
            args,
            { datePropName: 'mtsUpdate' }
          )
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getOrders',
        args,
        { isPrepareResponse: true }
      )
    }, 'getOrders', cb)
  }

  /**
   * @override
   */
  getActiveOrders (space, args, cb) {
    return this._responder(() => {
      return this._subAccountApiData
        .getDataForSubAccount(
          (args) => super.getActiveOrders(space, args),
          args,
          {
            datePropName: 'mtsUpdate',
            isNotPreparedResponse: true
          }
        )
    }, 'getActiveOrders', cb)
  }

  /**
   * @override
   */
  getMovements (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getMovements(space, args),
            args,
            { datePropName: 'mtsUpdated' }
          )
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getMovements',
        args,
        { isPrepareResponse: true }
      )
    }, 'getMovements', cb)
  }

  /**
   * @override
   */
  getFundingOfferHistory (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getFundingOfferHistory(space, args),
            args,
            { datePropName: 'mtsUpdate' }
          )
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getFundingOfferHistory',
        args,
        { isPrepareResponse: true }
      )
    }, 'getFundingOfferHistory', cb)
  }

  /**
   * @override
   */
  getFundingLoanHistory (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getFundingLoanHistory(space, args),
            args,
            { datePropName: 'mtsUpdate' }
          )
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getFundingLoanHistory',
        args,
        { isPrepareResponse: true }
      )
    }, 'getFundingLoanHistory', cb)
  }

  /**
   * @override
   */
  getFundingCreditHistory (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getFundingCreditHistory(space, args),
            args,
            { datePropName: 'mtsUpdate' }
          )
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getFundingCreditHistory',
        args,
        { isPrepareResponse: true }
      )
    }, 'getFundingCreditHistory', cb)
  }

  /**
   * @override
   */
  getLogins (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return this._subAccountApiData
          .getDataForSubAccount(
            (args) => super.getLogins(space, args),
            args,
            { datePropName: 'time' }
          )
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getLogins',
        args,
        { isPrepareResponse: true }
      )
    }, 'getLogins', cb)
  }

  /**
   * @override
   */
  getAccountSummary (space, args, cb) {
    return this._responder(async () => {
      return this._subAccountApiData
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
    }, 'getAccountSummary', cb)
  }

  /**
   * @override
   */
  getWallets (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForWallets')

      return this._wallets.getWallets(args)
    }, 'getWallets', cb)
  }

  getBalanceHistory (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForBalanceHistoryApi')

      return this._balanceHistory.getBalanceHistory(args)
    }, 'getBalanceHistory', cb)
  }

  getWinLoss (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForWinLossApi')

      return this._winLoss.getWinLoss(args)
    }, 'getWinLoss', cb)
  }

  getPositionsSnapshot (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForPositionsSnapshotApi')

      return this._positionsSnapshot.getPositionsSnapshot(args)
    }, 'getPositionsSnapshot', cb)
  }

  getFullSnapshotReport (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForFullSnapshotReportApi')

      return this._fullSnapshotReport.getFullSnapshotReport(args)
    }, 'getFullSnapshotReport', cb)
  }

  getFullTaxReport (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForFullTaxReportApi')

      return this._fullTaxReport.getFullTaxReport(args)
    }, 'getFullTaxReport', cb)
  }

  getTradedVolume (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForTradedVolumeApi')

      return this._tradedVolume.getTradedVolume(args)
    }, 'getTradedVolume', cb)
  }

  getFeesReport (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForFeesReportApi')

      return this._feesReport.getFeesReport(args)
    }, 'getFeesReport', cb)
  }

  getPerformingLoan (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForPerformingLoanApi')

      return this._performingLoan.getPerformingLoan(args)
    }, 'getPerformingLoan', cb)
  }

  /**
   * @override
   */
  getMultipleCsv (space, args, cb) {
    return this._responder(() => {
      return this._generateCsv(
        'getMultipleCsvJobData',
        args
      )
    }, 'getMultipleCsv', cb)
  }

  getBalanceHistoryCsv (space, args, cb) {
    return this._responder(() => {
      return this._generateCsv(
        'getBalanceHistoryCsvJobData',
        args
      )
    }, 'getBalanceHistoryCsv', cb)
  }

  getWinLossCsv (space, args, cb) {
    return this._responder(() => {
      return this._generateCsv(
        'getWinLossCsvJobData',
        args
      )
    }, 'getWinLossCsv', cb)
  }

  getPositionsSnapshotCsv (space, args, cb) {
    return this._responder(() => {
      return this._generateCsv(
        'getPositionsSnapshotCsvJobData',
        args
      )
    }, 'getPositionsSnapshotCsv', cb)
  }

  getFullSnapshotReportCsv (space, args, cb) {
    return this._responder(() => {
      return this._generateCsv(
        'getFullSnapshotReportCsvJobData',
        args
      )
    }, 'getFullSnapshotReportCsv', cb)
  }

  getFullTaxReportCsv (space, args, cb) {
    return this._responder(() => {
      return this._generateCsv(
        'getFullTaxReportCsvJobData',
        args
      )
    }, 'getFullTaxReportCsv', cb)
  }

  getTradedVolumeCsv (space, args, cb) {
    return this._responder(() => {
      return this._generateCsv(
        'getTradedVolumeCsvJobData',
        args
      )
    }, 'getTradedVolumeCsv', cb)
  }

  getFeesReportCsv (space, args, cb) {
    return this._responder(() => {
      return this._generateCsv(
        'getFeesReportCsvJobData',
        args
      )
    }, 'getFeesReportCsv', cb)
  }

  getPerformingLoanCsv (space, args, cb) {
    return this._responder(() => {
      return this._generateCsv(
        'getPerformingLoanCsvJobData',
        args
      )
    }, 'getPerformingLoanCsv', cb)
  }

  getCandlesCsv (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        return super.getCandlesCsv(space, args)
      }

      checkParams(args, 'paramsSchemaForCandlesCsv')

      return super.getCandlesCsv(space, args)
    }, 'getCandlesCsv', cb)
  }
}

module.exports = FrameworkReportService
