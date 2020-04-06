'use strict'

const { isEmpty } = require('lodash')
const moment = require('moment')
const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')
const {
  calcGroupedData,
  getMtsGroupedByTimeframe,
  groupByTimeframe,
  isForexSymb
} = require('../helpers')

class BalanceHistory {
  constructor (
    dao,
    wallets,
    FOREX_SYMBS,
    currencyConverter
  ) {
    this.dao = dao
    this.wallets = wallets
    this.FOREX_SYMBS = FOREX_SYMBS
    this.currencyConverter = currencyConverter
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

  _getSqlTimeframe (timeframe) {
    const day = timeframe === 'day' ? '-%m-%d' : ''
    const month = timeframe === 'month' ? '-%m' : ''
    const year = '%Y'

    return `strftime('${year}${month}${day}', mts/1000, 'unixepoch') AS timeframe`
  }

  _getWallets ({
    auth,
    timeframe,
    start,
    end
  }) {
    const sqlTimeframe = this._getSqlTimeframe(timeframe)
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
      '_getWallets',
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
    return this.dao.findInCollBy(
      '_getCandles',
      { params: { start: _start, end, timeframe: '1D' } },
      {
        isPublic: true,
        schema: { maxLimit: null },
        isExcludePrivate: false
      }
    )
  }

  _getCandlesClosePrice (
    candles,
    mts,
    timeframe,
    symb
  ) {
    const mtsMoment = moment.utc(mts)

    if (timeframe === 'day') {
      mtsMoment.add(1, 'days')
    }
    if (timeframe === 'month') {
      mtsMoment.add(1, 'months')
    }
    if (timeframe === 'year') {
      mtsMoment.add(1, 'years')
    }

    const _mts = mtsMoment.valueOf() - 1

    const price = this.currencyConverter.getPriceFromData(
      symb,
      _mts,
      { candles }
    )

    return price
  }

  _getWalletsByTimeframe (
    firstWallets,
    candles,
    timeframe
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
            `t${currency}USD`
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
        timeframe
      )
    }
  }

  _convertForexToUsd (
    obj,
    candles,
    mts,
    timeframe
  ) {
    const dataArr = Object.entries(obj)

    if (dataArr.length === 0) {
      return {}
    }

    const resInUsd = dataArr.reduce((accum, [symb, balance]) => {
      if (symb === 'USD') {
        return accum + balance
      }

      const prise = {
        ...this._getCandlesClosePrice(
          candles,
          mts,
          timeframe,
          `t${symb}USD`
        )
      }

      if (
        !Number.isFinite(prise) ||
        !Number.isFinite(balance)
      ) {
        return accum
      }

      return accum + balance * prise
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

    const firstWallets = await this.wallets.getWallets({
      auth,
      params: { end: start }
    })
    const wallets = await this._getWallets(args)
    const candles = await this._getCandles(args)

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

    const res = await calcGroupedData(
      {
        walletsGroupedByTimeframe,
        mtsGroupedByTimeframe
      },
      isSubCalc,
      this._getWalletsByTimeframe(
        firstWalletsGroupedByCurrency,
        candles,
        timeframe
      ),
      true
    )

    return res
  }
}

decorate(injectable(), BalanceHistory)
decorate(inject(TYPES.DAO), BalanceHistory, 0)
decorate(inject(TYPES.Wallets), BalanceHistory, 1)
decorate(inject(TYPES.FOREX_SYMBS), BalanceHistory, 2)
decorate(inject(TYPES.CurrencyConverter), BalanceHistory, 3)

module.exports = BalanceHistory
