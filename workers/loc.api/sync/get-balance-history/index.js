'use strict'

const { isEmpty } = require('lodash')

const {
  calcGroupedData,
  getMtsGroupedByTimeframe,
  groupByTimeframe,
  isForexSymb
} = require('../helpers')

const _calcWalletsInTimeframe = (
  data,
  symbolFieldName,
  symbol
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
        !balance ||
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

const _getWalletsByTimeframe = () => {
  let prevRes = {}

  return ({ walletsGroupedByTimeframe } = {}) => {
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

module.exports = async (
  { dao },
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
  const args = {
    auth,
    timeframe,
    start,
    end
  }

  const wallets = await _getWallets(dao, args)

  const walletsGroupedByTimeframe = await groupByTimeframe(
    wallets,
    timeframe,
    symbol,
    'mtsUpdate',
    'currency',
    _calcWalletsInTimeframe
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
    _getWalletsByTimeframe(),
    true
  )

  return res
}
