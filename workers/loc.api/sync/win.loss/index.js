'use strict'

const moment = require('moment')
const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')
const {
  calcGroupedData,
  groupByTimeframe,
  isForexSymb,
  getStartMtsByTimeframe
} = require('../helpers')

class WinLoss {
  constructor (
    dao,
    syncSchema,
    ALLOWED_COLLS,
    wallets,
    balanceHistory,
    positionsSnapshot,
    FOREX_SYMBS,
    authenticator
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.wallets = wallets
    this.balanceHistory = balanceHistory
    this.positionsSnapshot = positionsSnapshot
    this.FOREX_SYMBS = FOREX_SYMBS
    this.authenticator = authenticator
  }

  async _getPlFromPositionsSnapshot (args) {
    const {
      auth = {},
      params = {}
    } = { ...args }
    const { mts: end = Date.now() } = { ...params }
    const _args = {
      auth,
      params: { end }
    }

    const positionsSnapshot = await this.positionsSnapshot
      .getPositionsSnapshot(_args)

    if (
      !Array.isArray(positionsSnapshot) ||
      positionsSnapshot.length === 0
    ) {
      return null
    }

    return positionsSnapshot.reduce((accum, curr) => {
      const { plUsd } = { ...curr }
      const symb = 'USD'

      if (!Number.isFinite(plUsd)) {
        return accum
      }

      return {
        ...accum,
        [symb]: Number.isFinite(accum[symb])
          ? accum[symb] + plUsd
          : plUsd
      }
    }, {})
  }

  _sumMovementsWithPrevRes (
    prevMovementsRes,
    withdrawalsGroupedByTimeframe,
    depositsGroupedByTimefram
  ) {
    return this.FOREX_SYMBS.reduce((accum, symb) => {
      const prevMovement = Number.isFinite(prevMovementsRes[symb])
        ? prevMovementsRes[symb]
        : 0
      const withdrawals = Number.isFinite(withdrawalsGroupedByTimeframe[symb])
        ? withdrawalsGroupedByTimeframe[symb]
        : 0
      const deposits = Number.isFinite(depositsGroupedByTimefram[symb])
        ? depositsGroupedByTimefram[symb]
        : 0
      const res = prevMovement + withdrawals + deposits

      return {
        ...accum,
        [symb]: res
      }
    }, {})
  }

  _getWinLossByTimeframe (
    startWalletsVals = {},
    startPl = {},
    endPl = {}
  ) {
    let prevMovementsRes = {}

    return ({
      walletsGroupedByTimeframe = {},
      withdrawalsGroupedByTimeframe = {},
      depositsGroupedByTimeframe = {}
    } = {}, i) => {
      const isLast = i === 0
      const _startPl = { ...startPl }
      const _endPl = isLast ? { ...endPl } : {}

      prevMovementsRes = this._sumMovementsWithPrevRes(
        prevMovementsRes,
        { ...withdrawalsGroupedByTimeframe },
        { ...depositsGroupedByTimeframe }
      )

      return this.FOREX_SYMBS.reduce((accum, symb) => {
        const startWallet = Number.isFinite(startWalletsVals[symb])
          ? startWalletsVals[symb]
          : 0
        const wallet = Number.isFinite(walletsGroupedByTimeframe[symb])
          ? walletsGroupedByTimeframe[symb]
          : 0
        const movements = Number.isFinite(prevMovementsRes[symb])
          ? prevMovementsRes[symb]
          : 0
        const _startPlVal = Number.isFinite(_startPl[symb])
          ? _startPl[symb]
          : 0
        const _endPlVal = Number.isFinite(_endPl[symb])
          ? _endPl[symb]
          : 0
        const res = (wallet - startWallet - movements) +
          (_startPlVal + _endPlVal)

        if (!res) {
          return { ...accum }
        }

        return {
          ...accum,
          [symb]: res
        }
      }, {})
    }
  }

  _calcMovements (
    data = [],
    symbolFieldName,
    symbol = []
  ) {
    return data.reduce((accum, movement = {}) => {
      const { amount, amountUsd } = { ...movement }
      const currSymb = movement[symbolFieldName]
      const _isForexSymb = isForexSymb(currSymb, symbol)
      const _isNotUsedAmountUsdField = (
        _isForexSymb &&
        !Number.isFinite(amountUsd)
      )
      const _amount = _isNotUsedAmountUsdField
        ? amount
        : amountUsd
      const symb = _isNotUsedAmountUsdField
        ? currSymb
        : 'USD'

      if (!Number.isFinite(_amount)) {
        return { ...accum }
      }

      return {
        ...accum,
        [symb]: (Number.isFinite(accum[symb]))
          ? accum[symb] + _amount
          : _amount
      }
    }, {})
  }

  _getStartWallets () {
    return this.FOREX_SYMBS.reduce((accum, symb) => {
      return {
        ...accum,
        [symb]: 0
      }
    }, {})
  }

  _calcFirstWallets (
    data = [],
    startWallets = {}
  ) {
    return data.reduce((accum, movement = {}) => {
      const { balance, balanceUsd, currency } = { ...movement }
      const _isForexSymb = isForexSymb(currency, this.FOREX_SYMBS)
      const _isNotUsedBalanceUsdField = (
        _isForexSymb &&
        !Number.isFinite(balanceUsd)
      )
      const _balance = _isNotUsedBalanceUsdField
        ? balance
        : balanceUsd
      const symb = _isNotUsedBalanceUsdField
        ? currency
        : 'USD'

      if (!Number.isFinite(_balance)) {
        return { ...accum }
      }

      return {
        ...accum,
        [symb]: (Number.isFinite(accum[symb]))
          ? accum[symb] + _balance
          : _balance
      }
    }, startWallets)
  }

  _shiftMtsToNextTimeframe (
    groupedData,
    timeframe
  ) {
    return groupedData.map((item, i) => {
      if (
        i === (groupedData.length - 1) ||
        i === 0
      ) {
        return { ...item }
      }

      const normalizedMtsByTimeframe = getStartMtsByTimeframe(
        item.mts,
        timeframe
      )
      const mtsMoment = moment.utc(normalizedMtsByTimeframe)

      if (timeframe === 'day') {
        mtsMoment.add(1, 'days')
      }
      if (timeframe === 'month') {
        mtsMoment.add(1, 'months')
      }
      if (timeframe === 'year') {
        mtsMoment.add(1, 'years')
      }

      const mts = mtsMoment.valueOf()

      return { ...item, mts }
    })
  }

  async getWinLoss ({
    auth = {},
    params: {
      timeframe = 'day',
      start = 0,
      end = Date.now()
    } = {}
  } = {}) {
    const user = await this.authenticator
      .verifyRequestUser({ auth })

    const args = {
      auth,
      params: {
        timeframe,
        start,
        end
      }
    }
    const movementsModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.MOVEMENTS)
    const movementsMethodColl = this.syncSchema.getMethodCollMap()
      .get('_getMovements')
    const {
      symbolFieldName: movementsSymbolFieldName
    } = movementsMethodColl

    const withdrawals = await this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.MOVEMENTS,
      {
        filter: {
          $not: { status: 'CANCELED' },
          $lt: { amount: 0 },
          $gte: { mtsStarted: start },
          $lte: { mtsStarted: end },
          user_id: user._id
        },
        sort: [['mtsStarted', -1]],
        projection: movementsModel,
        exclude: ['user_id'],
        isExcludePrivate: true
      }
    )
    const deposits = await this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.MOVEMENTS,
      {
        filter: {
          status: 'COMPLETED',
          $gt: { amount: 0 },
          $gte: { mtsUpdated: start },
          $lte: { mtsUpdated: end },
          user_id: user._id
        },
        sort: [['mtsUpdated', -1]],
        projection: movementsModel,
        exclude: ['user_id'],
        isExcludePrivate: true
      }
    )
    const withdrawalsGroupedByTimeframe = await groupByTimeframe(
      withdrawals,
      { timeframe, start, end },
      this.FOREX_SYMBS,
      'mtsStarted',
      movementsSymbolFieldName,
      this._calcMovements.bind(this)
    )
    const depositsGroupedByTimeframe = await groupByTimeframe(
      deposits,
      { timeframe, start, end },
      this.FOREX_SYMBS,
      'mtsUpdated',
      movementsSymbolFieldName,
      this._calcMovements.bind(this)
    )

    const firstWallets = await this.wallets.getWallets({
      auth,
      params: { end: start }
    })
    const startWallets = this._getStartWallets()
    const startWalletsInForex = this._calcFirstWallets(
      firstWallets,
      startWallets
    )
    const walletsGroupedByTimeframe = await this.balanceHistory
      .getBalanceHistory(
        args,
        true
      )

    const startPl = await this._getPlFromPositionsSnapshot({
      auth,
      params: { mts: start }
    })
    const endPl = await this._getPlFromPositionsSnapshot({
      auth,
      params: { mts: end }
    })

    const groupedData = await calcGroupedData(
      {
        walletsGroupedByTimeframe,
        withdrawalsGroupedByTimeframe,
        depositsGroupedByTimeframe
      },
      false,
      this._getWinLossByTimeframe(
        startWalletsInForex,
        startPl,
        endPl
      ),
      true
    )
    groupedData.push({
      mts: start,
      USD: 0
    })
    const res = this._shiftMtsToNextTimeframe(
      groupedData,
      timeframe
    )

    return res
  }
}

decorate(injectable(), WinLoss)
decorate(inject(TYPES.DAO), WinLoss, 0)
decorate(inject(TYPES.SyncSchema), WinLoss, 1)
decorate(inject(TYPES.ALLOWED_COLLS), WinLoss, 2)
decorate(inject(TYPES.Wallets), WinLoss, 3)
decorate(inject(TYPES.BalanceHistory), WinLoss, 4)
decorate(inject(TYPES.PositionsSnapshot), WinLoss, 5)
decorate(inject(TYPES.FOREX_SYMBS), WinLoss, 6)
decorate(inject(TYPES.Authenticator), WinLoss, 7)

module.exports = WinLoss
