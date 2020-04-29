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
  getAuthFromSubAccountAuth
} = require('./helpers')

const INITIAL_PROGRESS = 'SYNCHRONIZATION_HAS_NOT_STARTED_YET'

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
    await this._progress.setProgress(INITIAL_PROGRESS)
    await this._dao.updateRecordOf(
      this._TABLES_NAMES.SYNC_MODE,
      { isEnable: true }
    )
    await this._dao.updateRecordOf(
      this._TABLES_NAMES.SCHEDULER,
      { isEnable: true }
    )
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
    } = await super.verifyUser(null, { ...args, auth })

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
    return this._responder(() => {
      return this._authenticator.verifyUser(
        args,
        {
          projection: [
            'username',
            'timezone',
            'email',
            'id',
            'isSubAccount'
          ]
        }
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
      await this._dao.updateRecordOf(
        this._TABLES_NAMES.SYNC_MODE,
        { isEnable: true }
      )
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

  isSyncModeWithDbData (space, args, cb) {
    const { auth } = { ...args }
    const { _id } = { ...auth }
    const isRequiredUser = (cb || !Number.isInteger(_id))
    const responder = isRequiredUser
      ? this._privResponder
      : this._responder
    const endingArgs = isRequiredUser
      ? [args, cb]
      : [cb]

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
    }, 'isSyncModeWithDbData', ...endingArgs)
  }

  enableScheduler (space, args, cb) {
    return this._privResponder(async () => {
      await this._dao.updateRecordOf(
        this._TABLES_NAMES.SCHEDULER,
        { isEnable: true }
      )

      return this.syncNow()
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
    }, 'isSchedulerEnabled', cb)
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
        : false
    }, 'getSyncProgress', args, cb)
  }

  syncNow (space, args = {}, cb) {
    const responder = cb
      ? this._privResponder
      : this._responder
    const endingArgs = cb
      ? [args, cb]
      : [cb]

    return responder(async () => {
      const { params } = { ...args }
      const {
        syncColls = this._ALLOWED_COLLS.ALL
      } = { ...params }

      return this._sync.start(true, syncColls)
    }, 'syncNow', ...endingArgs)
  }

  getPublicTradesConf (space, args = {}, cb) {
    return this._privResponder(() => {
      return this._publicСollsСonfAccessors
        .getPublicСollsСonf('publicTradesConf', args)
    }, 'getPublicTradesConf', args, cb)
  }

  getTickersHistoryConf (space, args = {}, cb) {
    return this._privResponder(() => {
      return this._publicСollsСonfAccessors
        .getPublicСollsСonf('tickersHistoryConf', args)
    }, 'getTickersHistoryConf', args, cb)
  }

  getStatusMessagesConf (space, args = {}, cb) {
    return this._privResponder(() => {
      return this._publicСollsСonfAccessors
        .getPublicСollsСonf('statusMessagesConf', args)
    }, 'getStatusMessagesConf', args, cb)
  }

  getCandlesConf (space, args = {}, cb) {
    return this._privResponder(() => {
      return this._publicСollsСonfAccessors
        .getPublicСollsСonf('candlesConf', args)
    }, 'getCandlesConf', args, cb)
  }

  editPublicTradesConf (space, args = {}, cb) {
    return this._privResponder(async () => {
      checkParams(args, 'paramsSchemaForEditPublicСollsСonf')

      await this._publicСollsСonfAccessors
        .editPublicСollsСonf('publicTradesConf', args)
      await this._sync.start(true, this._ALLOWED_COLLS.PUBLIC_TRADES)

      return true
    }, 'editPublicTradesConf', args, cb)
  }

  editTickersHistoryConf (space, args = {}, cb) {
    return this._privResponder(async () => {
      checkParams(args, 'paramsSchemaForEditPublicСollsСonf')

      await this._publicСollsСonfAccessors
        .editPublicСollsСonf('tickersHistoryConf', args)
      await this._sync.start(true, this._ALLOWED_COLLS.TICKERS_HISTORY)

      return true
    }, 'editTickersHistoryConf', args, cb)
  }

  editStatusMessagesConf (space, args = {}, cb) {
    return this._privResponder(async () => {
      checkParams(args, 'paramsSchemaForEditPublicСollsСonf')

      await this._publicСollsСonfAccessors
        .editPublicСollsСonf('statusMessagesConf', args)
      await this._sync.start(true, this._ALLOWED_COLLS.STATUS_MESSAGES)

      return true
    }, 'editStatusMessagesConf', args, cb)
  }

  editCandlesConf (space, args = {}, cb) {
    return this._privResponder(async () => {
      checkParams(args, 'paramsSchemaForEditCandlesСonf')

      await this._publicСollsСonfAccessors
        .editPublicСollsСonf('candlesConf', args)
      await this._sync.start(true, this._ALLOWED_COLLS.CANDLES)

      return true
    }, 'editCandlesConf', args, cb)
  }

  editAllPublicСollsСonfs (space, args = {}, cb) {
    return this._privResponder(async () => {
      checkParams(args, 'paramsSchemaForEditAllPublicСollsСonfs')

      const syncedColls = await this._publicСollsСonfAccessors
        .editAllPublicСollsСonfs(args)
      await this._sync.start(true, syncedColls)

      return true
    }, 'editCandlesConf', args, cb)
  }

  getAllPublicСollsСonfs (space, args = {}, cb) {
    return this._privResponder(() => {
      return this._publicСollsСonfAccessors
        .getAllPublicСollsСonfs(args)
    }, 'editCandlesConf', args, cb)
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
    return this._privResponder(async () => {
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
    }, 'getPositionsHistory', args, cb)
  }

  /**
   * @override
   */
  getActivePositions (space, args, cb) {
    return this._privResponder(() => {
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
    }, 'getActivePositions', args, cb)
  }

  /**
   * @override
   */
  getPositionsAudit (space, args, cb) {
    return this._privResponder(() => {
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
    return this._privResponder(async () => {
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

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getFundingTrades',
        args,
        { isPrepareResponse: true }
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
          checkParamsFn: (args) => checkParams(
            args, 'paramsSchemaForOrderTradesApi'
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

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getOrders',
        args,
        { isPrepareResponse: true }
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

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getMovements',
        args,
        { isPrepareResponse: true }
      )
    }, 'getMovements', args, cb)
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

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getFundingOfferHistory',
        args,
        { isPrepareResponse: true }
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

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getFundingLoanHistory',
        args,
        { isPrepareResponse: true }
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

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getFundingCreditHistory',
        args,
        { isPrepareResponse: true }
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

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getLogins',
        args,
        { isPrepareResponse: true }
      )
    }, 'getLogins', args, cb)
  }

  /**
   * @override
   */
  getAccountSummary (space, args, cb) {
    return this._privResponder(async () => {
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
    }, 'getAccountSummary', args, cb)
  }

  /**
   * @override
   */
  getWallets (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForWallets')

      return this._wallets.getWallets(args)
    }, 'getWallets', args, cb)
  }

  getBalanceHistory (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForBalanceHistoryApi')

      return this._balanceHistory.getBalanceHistory(args)
    }, 'getBalanceHistory', args, cb)
  }

  getWinLoss (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForWinLossApi')

      return this._winLoss.getWinLoss(args)
    }, 'getWinLoss', args, cb)
  }

  getPositionsSnapshot (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForPositionsSnapshotApi')

      return this._positionsSnapshot.getPositionsSnapshot(args)
    }, 'getPositionsSnapshot', args, cb)
  }

  getFullSnapshotReport (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForFullSnapshotReportApi')

      return this._fullSnapshotReport.getFullSnapshotReport(args)
    }, 'getFullSnapshotReport', args, cb)
  }

  getFullTaxReport (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForFullTaxReportApi')

      return this._fullTaxReport.getFullTaxReport(args)
    }, 'getFullTaxReport', args, cb)
  }

  getTradedVolume (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForTradedVolumeApi')

      return this._tradedVolume.getTradedVolume(args)
    }, 'getTradedVolume', args, cb)
  }

  getFeesReport (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForFeesReportApi')

      return this._feesReport.getFeesReport(args)
    }, 'getFeesReport', args, cb)
  }

  getPerformingLoan (space, args, cb) {
    return this._privResponder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        throw new DuringSyncMethodAccessError()
      }

      checkParams(args, 'paramsSchemaForPerformingLoanApi')

      return this._performingLoan.getPerformingLoan(args)
    }, 'getPerformingLoan', args, cb)
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
