'use strict'

const { isEmpty } = require('lodash')

const {
  calcGroupedData,
  getMtsGroupedByTimeframe,
  groupByTimeframe,
  isForexSymb
} = require('../helpers')

const _calcWalletsInTimeframe = (firstWallets) => {
  let wallets = [...firstWallets]

  return (
    data,
    symbolFieldName,
    symbol
  ) => {
    const missingWallets = wallets.filter(w => (
      data.every(({ type, currency }) => (
        w.type !== type || w.currency !== currency
      ))
    ))

    wallets = [...data, ...missingWallets]

    return wallets.reduce((
      accum,
      { currency, balance, balanceUsd }
    ) => {
      const _isForexSymb = isForexSymb(symbol, currency)
      const _balance = _isForexSymb
        ? balance
        : balanceUsd
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

const _getWalletsByTimeframe = (firstWallets) => {
  let prevRes = {}

  return (
    { walletsGroupedByTimeframe } = {},
    i,
    arr
  ) => {
    if (i === (arr.length - 1)) {
      prevRes = { ...firstWallets }
    }
    if (
      isEmpty(walletsGroupedByTimeframe) &&
      !isEmpty(prevRes)
    ) {
      return prevRes
    }

    prevRes = { ...walletsGroupedByTimeframe }

    return walletsGroupedByTimeframe
  }
}

const _calcFirstWallets = (
  data = [],
  symbol = []
) => {
  return data.reduce((
    accum,
    { currency, balance, balanceUsd }
  ) => {
    const _isForexSymb = isForexSymb(symbol, currency)
    const _balance = _isForexSymb
      ? balance
      : balanceUsd
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

  const firstWalletsInForex = _calcFirstWallets(firstWallets, symbol)

  const res = await calcGroupedData(
    {
      walletsGroupedByTimeframe,
      mtsGroupedByTimeframe
    },
    isSubCalc,
    _getWalletsByTimeframe(firstWalletsInForex),
    true
  )

  return res
}
