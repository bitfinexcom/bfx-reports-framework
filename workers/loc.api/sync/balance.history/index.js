'use strict'

const { isEmpty } = require('lodash')
const moment = require('moment')

const {
  calcGroupedData,
  getMtsGroupedByTimeframe,
  groupByTimeframe,
  isForexSymb
} = require('../helpers')
const { getTimeframeQuery } = require('../dao/helpers')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.Wallets,
  TYPES.FOREX_SYMBS,
  TYPES.CurrencyConverter,
  TYPES.SYNC_API_METHODS,
  TYPES.ALLOWED_COLLS
]
class BalanceHistory {
  constructor (
    dao,
    wallets,
    FOREX_SYMBS,
    currencyConverter,
    SYNC_API_METHODS,
    ALLOWED_COLLS
  ) {
    this.dao = dao
    this.wallets = wallets
    this.FOREX_SYMBS = FOREX_SYMBS
    this.currencyConverter = currencyConverter
    this.SYNC_API_METHODS = SYNC_API_METHODS
    this.ALLOWED_COLLS = ALLOWED_COLLS
  }

  _groupWalletsByCurrency (wallets = []) {
    return wallets.reduce((
      accum,
      { currency, balance }
    ) => {
      if (!Number.isFinite(balance)) {
        return { ...accum }
      }

      return {
        ...accum,
        [currency]: (Number.isFinite(accum[currency]))
          ? accum[currency] + balance
          : balance
      }
    }, {})
  }

  _calcWalletsInTimeframe (firstWallets) {
    let wallets = [...firstWallets]

    return (data) => {
      const missingWallets = wallets.filter(w => (
        data.every(({ type, currency }) => (
          w.type !== type || w.currency !== currency
        ))
      ))

      wallets = [...data, ...missingWallets]

      return this._groupWalletsByCurrency(wallets)
    }
  }

  _getWallets ({
    auth,
    timeframe,
    start,
    end
  }) {
    const sqlTimeframe = getTimeframeQuery(timeframe)
    const schema = {
      groupResBy: ['wallet', 'currency', 'timeframe'],
      dataStructureConverter: (accum, {
        wallet: type,
        currency,
        balance,
        balanceUsd,
        mts: mtsUpdate,
        timeframe
      } = {}) => {
        if (
          !type ||
          typeof type !== 'string' ||
          !Number.isFinite(balance) ||
          typeof currency !== 'string' ||
          currency.length < 3
        ) {
          return accum
        }

        accum.push({
          type,
          currency,
          balance,
          balanceUsd,
          timeframe,
          mtsUpdate
        })

        return accum
      }
    }

    return this.dao.findInCollBy(
      this.SYNC_API_METHODS.WALLETS,
      {
        auth,
        params: { start, end }
      },
      {
        additionalModel: { [sqlTimeframe]: '' },
        schema
      }
    )
  }

  _getCandles ({
    start = 0,
    end = Date.now()
  }) {
    const mtsMoment = moment.utc(start)
      .add(-1, 'days')
      .valueOf()
    const _start = start
      ? mtsMoment
      : start

    return this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.CANDLES,
      {
        filter: {
          $eq: { _timeframe: '1D' },
          $lte: { mts: end },
          $gte: { mts: _start }
        },
        sort: [['mts', -1]],
        projection: ['mts', 'close', '_symbol']
      }
    )
  }

  _getCandlesClosePrice (
    candles,
    mts,
    timeframe,
    symb,
    currenciesSynonymous
  ) {
    const mtsMoment = moment.utc(mts)

    if (timeframe === 'day') {
      mtsMoment.add(1, 'days')
    }
    if (timeframe === 'month') {
      mtsMoment.add(1, 'months')
    }
    if (timeframe === 'week') {
      mtsMoment.add(1, 'weeks')
    }
    if (timeframe === 'year') {
      mtsMoment.add(1, 'years')
    }

    const _mts = mtsMoment.valueOf() - 1

    const price = this.currencyConverter.getPriceFromData(
      symb,
      _mts,
      { candles, currenciesSynonymous }
    )

    return price
  }

  _getWalletsByTimeframe (
    firstWallets,
    candles,
    timeframe,
    currenciesSynonymous
  ) {
    let prevRes = { ...firstWallets }

    return (
      {
        walletsGroupedByTimeframe = {},
        mtsGroupedByTimeframe: { mts } = {}
      } = {}
    ) => {
      const isReturnedPrevRes = (
        isEmpty(walletsGroupedByTimeframe) &&
        !isEmpty(prevRes)
      )
      const walletsArr = isReturnedPrevRes
        ? Object.entries(prevRes)
        : Object.entries(walletsGroupedByTimeframe)
      const res = walletsArr.reduce((
        accum,
        [currency, balance]
      ) => {
        const _isForexSymb = isForexSymb(currency, this.FOREX_SYMBS)
        const price = _isForexSymb
          ? null
          : this._getCandlesClosePrice(
            candles,
            mts,
            timeframe,
            `t${currency}USD`,
            currenciesSynonymous
          )

        if (!_isForexSymb && !Number.isFinite(price)) {
          return { ...accum }
        }

        const _balance = _isForexSymb
          ? balance
          : balance * price
        const symb = _isForexSymb
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
      }, {})

      if (!isReturnedPrevRes) {
        prevRes = { ...walletsGroupedByTimeframe }
      }

      return this._convertForexToUsd(
        res,
        candles,
        mts,
        timeframe,
        currenciesSynonymous
      )
    }
  }

  _convertForexToUsd (
    obj,
    candles,
    mts,
    timeframe,
    currenciesSynonymous
  ) {
    const dataArr = Object.entries(obj)

    if (dataArr.length === 0) {
      return {}
    }

    const resInUsd = dataArr.reduce((accum, [symb, balance]) => {
      if (symb === 'USD') {
        return accum + balance
      }

      const price = this._getCandlesClosePrice(
        candles,
        mts,
        timeframe,
        `t${symb}USD`,
        currenciesSynonymous
      )

      if (
        !Number.isFinite(price) ||
        !Number.isFinite(balance)
      ) {
        return accum
      }

      return accum + balance * price
    }, 0)

    return { USD: resInUsd }
  }

  async _getWalletsGroupedByOneTimeframe (
    args,
    isSubCalc
  ) {
    const {
      params: { end } = {}
    } = { ...args }
    const startWallets = this.FOREX_SYMBS
      .reduce((accum, symb) => {
        return {
          ...accum,
          [symb]: 0
        }
      }, {})
    const lastWallets = await this.wallets.getWallets(args)

    const res = lastWallets.reduce((accum, movement = {}) => {
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
    const vals = isSubCalc
      ? { vals: res }
      : res

    return [{
      mts: end,
      ...vals
    }]
  }

  async _getStartingMts (
    args,
    groupedWallets
  ) {
    if (
      Array.isArray(groupedWallets) &&
      groupedWallets.length > 0 &&
      groupedWallets[groupedWallets.length - 1] &&
      typeof groupedWallets[groupedWallets.length - 1] === 'object' &&
      Number.isInteger(groupedWallets[groupedWallets.length - 1].mts)
    ) {
      return groupedWallets[groupedWallets.length - 1].mts
    }

    const firstWalletsMts = await this.wallets.getFirstWalletsMts(args)

    if (Number.isInteger(firstWalletsMts)) {
      return firstWalletsMts
    }

    const { params } = { ...args }
    const { start = 0 } = { ...params }

    return start
  }

  async getBalanceHistory (
    {
      auth = {},
      params: {
        timeframe = 'day',
        start = 0,
        end = Date.now()
      } = {}
    } = {},
    isSubCalc = false
  ) {
    if (Number.isInteger(timeframe)) {
      return this._getWalletsGroupedByOneTimeframe(
        {
          auth,
          params: { end }
        },
        isSubCalc
      )
    }

    const args = {
      auth,
      timeframe,
      start,
      end
    }

    const firstWalletsPromise = this.wallets.getWallets({
      auth,
      params: { end: start }
    })
    const walletsPromise = this._getWallets(args)
    const candlesPromise = this._getCandles(args)

    const [
      firstWallets,
      wallets,
      candles
    ] = await Promise.all([
      firstWalletsPromise,
      walletsPromise,
      candlesPromise
    ])

    const firstWalletsGroupedByCurrency = this._groupWalletsByCurrency(
      firstWallets
    )
    const walletsGroupedByTimeframe = await groupByTimeframe(
      wallets,
      { timeframe, start, end },
      this.FOREX_SYMBS,
      'mtsUpdate',
      'currency',
      this._calcWalletsInTimeframe(firstWallets)
    )
    const startingMts = await this._getStartingMts(
      args,
      walletsGroupedByTimeframe
    )
    const mtsGroupedByTimeframe = getMtsGroupedByTimeframe(
      startingMts,
      end,
      timeframe,
      true
    )

    const currenciesSynonymous = await this.currencyConverter
      .getCurrenciesSynonymous()

    const res = await calcGroupedData(
      {
        walletsGroupedByTimeframe,
        mtsGroupedByTimeframe
      },
      isSubCalc,
      this._getWalletsByTimeframe(
        firstWalletsGroupedByCurrency,
        candles,
        timeframe,
        currenciesSynonymous
      ),
      true
    )

    return res
  }
}

decorateInjectable(BalanceHistory, depsTypes)

module.exports = BalanceHistory
