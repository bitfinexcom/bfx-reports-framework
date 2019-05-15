'use strict'

const { isEmpty } = require('lodash')
const moment = require('moment')

const {
  calcGroupedData,
  getMtsGroupedByTimeframe,
  groupByTimeframe,
  isForexSymb
} = require('../helpers')

const _calcWalletsInTimeframe = (firstWallets) => {
  let wallets = [...firstWallets]

  return (data) => {
    const missingWallets = wallets.filter(w => (
      data.every(({ type, currency }) => (
        w.type !== type || w.currency !== currency
      ))
    ))

    wallets = [...data, ...missingWallets]

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
}

const _getSqlTimeframe = (timeframe) => {
  const day = timeframe === 'day' ? '-%m-%d' : ''
  const month = timeframe === 'month' ? '-%m' : ''
  const year = '%Y'

  return `strftime('${year}${month}${day}', mts/1000, 'unixepoch') AS timeframe`
}

const _getWallets = (
  dao,
  {
    auth,
    timeframe,
    start,
    end
  }
) => {
  const sqlTimeframe = _getSqlTimeframe(timeframe)
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

  return dao.findInCollBy(
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

const _getCandles = (
  dao,
  {
    start = 0,
    end = Date.now()
  }
) => {
  return dao.findInCollBy(
    '_getCandles',
    { params: { start, end } },
    {
      isPublic: true,
      schema: { maxLimit: null },
      isExcludePrivate: false
    }
  )
}

const _getCandlesClosePrice = (
  candles,
  mts,
  timeframe,
  currency
) => {
  const symb = `t${currency}USD`
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

  return candles.find(({
    mts: cMts,
    close,
    _symbol
  }) => (
    symb === _symbol &&
    Number.isFinite(close) &&
    cMts <= _mts
  ))
}

const _getWalletsByTimeframe = (
  firstWallets,
  candles,
  symbol,
  timeframe
) => {
  let prevRes = {}

  return (
    {
      walletsGroupedByTimeframe = {},
      mtsGroupedByTimeframe: { mts } = {}
    } = {},
    i,
    arr
  ) => {
    if (i === (arr.length - 1)) {
      prevRes = { ...firstWallets }
    }

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
      const _isForexSymb = isForexSymb(symbol, currency)
      const { close: closePrice } = _isForexSymb
        ? {}
        : { ..._getCandlesClosePrice(candles, mts, timeframe, currency) }

      if (!_isForexSymb && !Number.isFinite(closePrice)) {
        return { ...accum }
      }

      const _balance = _isForexSymb
        ? balance
        : balance * closePrice
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

    return res
  }
}

module.exports = async (
  rService,
  {
    auth = {},
    params: {
      timeframe = 'day',
      start = 0,
      end = Date.now()
    } = {}
  } = {},
  isSubCalc = false,
  symbol = ['EUR', 'JPY', 'GBP', 'USD']
) => {
  const { dao } = rService
  const args = {
    auth,
    timeframe,
    start,
    end
  }

  const firstWallets = await rService.getWallets(null, {
    auth,
    params: { end: start }
  })
  const wallets = await _getWallets(dao, args)
  const candles = await _getCandles(dao, args)

  const walletsGroupedByTimeframe = await groupByTimeframe(
    wallets,
    timeframe,
    symbol,
    'mtsUpdate',
    'currency',
    _calcWalletsInTimeframe(firstWallets)
  )
  const mtsGroupedByTimeframe = getMtsGroupedByTimeframe(
    start,
    end,
    timeframe
  )

  const res = await calcGroupedData(
    {
      walletsGroupedByTimeframe,
      mtsGroupedByTimeframe
    },
    isSubCalc,
    _getWalletsByTimeframe(
      firstWallets,
      candles,
      symbol,
      timeframe
    ),
    true
  )

  return res
}
