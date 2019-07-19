'use strict'

const {
  pick,
  isEmpty
} = require('lodash')
const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')
const {
  isAuthError
} = require('bfx-report/workers/loc.api/helpers')

const ReportService = require('./service.report')
const {
  ServerAvailabilityError,
  DuringSyncMethodAccessError
} = require('./errors')
const {
  checkParams,
  getCsvJobData,
  checkParamsAuth,
  isEnotfoundError,
  isEaiAgainError,
  getTimezoneConf,
  emptyRes,
  collObjToArr
} = require('./helpers')

class FrameworkReportService extends ReportService {
  /**
   * @override
   */
  async _initialize (db) {
    await super._initialize()

    await this._databaseInitialize(db)
  }

  /**
   * @abstract
   */
  async _databaseInitialize (db) {
    await this._dao.databaseInitialize(db)
    await this._dao.updateProgress('SYNCHRONIZATION_HAS_NOT_STARTED_YET')
    await this._dao.updateStateOf('syncMode', true)
    await this._dao.updateStateOf('scheduler', true)
  }

  /**
   * @override
   */
  async _getUserInfo (args) {
    try {
      const {
        username,
        timezone,
        email,
        id
      } = await this._dao.checkAuthInDb(args)

      if (
        !username ||
        typeof username !== 'string'
      ) {
        return false
      }

      return {
        username,
        timezone,
        email,
        id
      }
    } catch (err) {
      return false
    }
  }

  async _checkAuthInApi (args) {
    checkParamsAuth(args)

    const {
      email,
      timezone,
      username,
      id
    } = await super._getUserInfo(args)

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

  /**
   * @override
   */
  login (space, args, cb, isInnerCall) {
    return this._responder(async () => {
      let userInfo = {
        email: null,
        timezone: null,
        id: null
      }

      try {
        userInfo = await this._checkAuthInApi(args)
      } catch (err) {
        if (isAuthError(err)) {
          throw err
        }
      }

      const data = {
        ...args.auth,
        ...userInfo
      }

      const user = await this._dao.insertOrUpdateUser(data)
      const isSyncModeConfig = this.isSyncModeConfig()

      return isInnerCall
        ? { ...user, isSyncModeConfig }
        : user.email
    }, 'login', cb)
  }

  logout (space, args, cb) {
    return this._responder(async () => {
      await this._dao.deactivateUser(args.auth)

      return true
    }, 'logout', cb)
  }

  checkAuthInDb (space, args, cb) {
    return this._responder(async () => {
      const { email } = await this._dao.checkAuthInDb(args)

      return email
    }, 'checkAuthInDb', cb)
  }

  pingApi (space, args, cb) {
    return this._responder(async () => {
      try {
        await this._getSymbols()

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
      checkParamsAuth(args)

      await this._dao.updateStateOf('syncMode', true)
      await this._dao.updateUserByAuth({
        ...pick(args.auth, ['apiKey', 'apiSecret']),
        isDataFromDb: 1
      })
      await this._sync.start(true)

      return true
    }, 'enableSyncMode', cb)
  }

  disableSyncMode (space, args, cb) {
    return this._responder(async () => {
      checkParamsAuth(args)

      const { auth } = { ...args }

      await this._dao.updateUserByAuth({
        ...pick(auth, ['apiKey', 'apiSecret']),
        isDataFromDb: 0
      })
      await this._wsEventEmitter.emitRedirectingRequestsStatusToApi(
        (user) => {
          if (this._wsEventEmitter.isInvalidAuth(args, user)) {
            return null
          }

          return true
        }
      )

      return true
    }, 'disableSyncMode', cb)
  }

  isSyncModeWithDbData (space, args, cb) {
    return this._responder(async () => {
      const user = await this._dao.checkAuthInDb(args, false)
      const firstElem = await this._dao.getFirstElemInCollBy('syncMode')

      return (
        !isEmpty(firstElem) &&
        !isEmpty(user) &&
        !!firstElem.isEnable &&
        user.isDataFromDb
      )
    }, 'isSyncModeWithDbData', cb)
  }

  enableScheduler (space, args, cb) {
    return this._responder(async () => {
      await this._dao.checkAuthInDb(args)
      await this._dao.updateStateOf('scheduler', true)

      return this.syncNow()
    }, 'enableScheduler', cb)
  }

  disableScheduler (space, args, cb) {
    return this._responder(async () => {
      await this._dao.checkAuthInDb(args)
      await this._dao.updateStateOf('scheduler', false)

      return true
    }, 'disableScheduler', cb)
  }

  isSchedulerEnabled (space, args, cb) {
    return this._responder(async () => {
      try {
        const firstElem = await this._dao.getFirstElemInCollBy(
          'scheduler',
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

  /**
   * @override
   */
  getEmail (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        super.getEmail(space, args, cb)

        return
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
        super.getUsersTimeConf(space, args, cb)

        return
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
        super.getSymbols(space, args, cb)

        return
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
      const symbolsArr = collObjToArr(symbols, symbolsField)
      const futuresArr = collObjToArr(futures, futuresField)
      const pairs = [...symbolsArr, ...futuresArr]

      return { pairs, currencies }
    }, 'getSymbols', cb)
  }

  /**
   * @override
   */
  getTickersHistory (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        super.getTickersHistory(space, args, cb)

        return
      }

      checkParams(args, 'paramsSchemaForApi', ['symbol'])

      const confs = await this._publicСollsСonfAccessors
        .getPublicСollsСonf(
          'tickersHistoryConf',
          args
        )

      if (isEmpty(confs)) {
        return emptyRes()
      }

      const _symb = args.params.symbol
        ? [args.params.symbol]
        : []
      const symbols = Array.isArray(args.params.symbol)
        ? args.params.symbol
        : _symb
      const filteredSymbols = symbols.filter(symb => {
        return confs.some(conf => symb === conf.symbol)
      })

      if (
        !isEmpty(symbols) &&
        isEmpty(filteredSymbols)
      ) {
        return emptyRes()
      }

      args.params.symbol = filteredSymbols

      const minConfStart = confs.reduce(
        (accum, conf) => {
          return (accum === null || conf.start < accum)
            ? conf.start
            : accum
        },
        null
      )

      if (
        Number.isFinite(args.params.start) &&
        args.params.start < minConfStart
      ) {
        args.params.start = minConfStart
      }

      return this._dao.findInCollBy(
        '_getTickersHistory',
        args,
        {
          isPrepareResponse: true,
          isPublic: true
        }
      )
    }, 'getTickersHistory', cb)
  }

  /**
   * @override
   */
  getPositionsHistory (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        super.getPositionsHistory(space, args, cb)

        return
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getPositionsHistory',
        args,
        {
          isPrepareResponse: true
        }
      )
    }, 'getPositionsHistory', cb)
  }

  /**
   * @override
   */
  getLedgers (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        const { isMarginFundingPayment } = { ...args.params }

        if (isMarginFundingPayment) {
          throw new DuringSyncMethodAccessError()
        }

        super.getLedgers(space, args, cb)

        return
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getLedgers',
        args,
        {
          isPrepareResponse: true
        }
      )
    }, 'getLedgers', cb)
  }

  /**
   * @override
   */
  getTrades (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        super.getTrades(space, args, cb)

        return
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getTrades',
        args,
        {
          isPrepareResponse: true
        }
      )
    }, 'getTrades', cb)
  }

  /**
   * @override
   */
  getFundingTrades (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        super.getFundingTrades(space, args, cb)

        return
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getFundingTrades',
        args,
        {
          isPrepareResponse: true
        }
      )
    }, 'getFundingTrades', cb)
  }

  /**
   * @override
   */
  getPublicTrades (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        super.getPublicTrades(space, args, cb)

        return
      }

      checkParams(args, 'paramsSchemaForPublicTrades', ['symbol'])

      const symbol = Array.isArray(args.params.symbol)
        ? args.params.symbol[0]
        : args.params.symbol
      const { _id } = await this._dao.checkAuthInDb(args)
      const conf = await this._dao.getElemInCollBy(
        'publicСollsСonf',
        {
          confName: 'publicTradesConf',
          user_id: _id,
          symbol
        },
        [['symbol', 1]]
      )

      if (isEmpty(conf)) {
        return emptyRes()
      }

      if (
        Number.isFinite(args.params.start) &&
        args.params.start < conf.start
      ) {
        args.params.start = conf.start
      }

      return this._dao.findInCollBy(
        '_getPublicTrades',
        args,
        {
          isPrepareResponse: true,
          isPublic: true
        }
      )
    }, 'getPublicTrades', cb)
  }

  /**
   * @override
   */
  getOrderTrades (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        super.getOrderTrades(space, args, cb)

        return
      }

      checkParams(args, 'paramsSchemaForOrderTradesApi')

      const { id: orderID } = { ...args.params }

      return this._dao.findInCollBy(
        '_getTrades',
        args,
        {
          isPrepareResponse: true,
          schema: {
            additionalFilteringProps: { orderID }
          }
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
        super.getOrders(space, args, cb)

        return
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getOrders',
        args,
        {
          isPrepareResponse: true
        }
      )
    }, 'getOrders', cb)
  }

  /**
   * @override
   */
  getMovements (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        super.getMovements(space, args, cb)

        return
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getMovements',
        args,
        {
          isPrepareResponse: true
        }
      )
    }, 'getMovements', cb)
  }

  /**
   * @override
   */
  getFundingOfferHistory (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        super.getFundingOfferHistory(space, args, cb)

        return
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getFundingOfferHistory',
        args,
        {
          isPrepareResponse: true
        }
      )
    }, 'getFundingOfferHistory', cb)
  }

  /**
   * @override
   */
  getFundingLoanHistory (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        super.getFundingLoanHistory(space, args, cb)

        return
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getFundingLoanHistory',
        args,
        {
          isPrepareResponse: true
        }
      )
    }, 'getFundingLoanHistory', cb)
  }

  /**
   * @override
   */
  getFundingCreditHistory (space, args, cb) {
    return this._responder(async () => {
      if (!await this.isSyncModeWithDbData(space, args)) {
        super.getFundingCreditHistory(space, args, cb)

        return
      }

      checkParams(args, 'paramsSchemaForApi')

      return this._dao.findInCollBy(
        '_getFundingCreditHistory',
        args,
        {
          isPrepareResponse: true
        }
      )
    }, 'getFundingCreditHistory', cb)
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

  getMultipleCsv (space, args, cb) {
    return this._responder(() => {
      return this._generateCsv(
        'getMultipleCsvJobData',
        { ...args, getCsvJobData }
      )
    }, 'getMultipleCsv', cb)
  }

  getBalanceHistoryCsv (space, args, cb) {
    return this._responder(() => {
      return this._generateCsv(
        'getBalanceHistoryCsvJobData',
        { ...args, getCsvJobData }
      )
    }, 'getBalanceHistoryCsv', cb)
  }

  getWinLossCsv (space, args, cb) {
    return this._responder(() => {
      return this._generateCsv(
        'getWinLossCsvJobData',
        { ...args, getCsvJobData }
      )
    }, 'getWinLossCsv', cb)
  }

  getPositionsSnapshotCsv (space, args, cb) {
    return this._responder(() => {
      return this._generateCsv(
        'getPositionsSnapshotCsvJobData',
        { ...args, getCsvJobData }
      )
    }, 'getPositionsSnapshotCsv', cb)
  }

  getFullSnapshotReportCsv (space, args, cb) {
    return this._responder(() => {
      return this._generateCsv(
        'getFullSnapshotReportCsvJobData',
        { ...args, getCsvJobData }
      )
    }, 'getFullSnapshotReportCsv', cb)
  }
}

module.exports = FrameworkReportService
