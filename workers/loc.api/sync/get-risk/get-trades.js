'use strict'

const { min, max } = require('lodash')

const {
  getInsertableArrayObjectsFilter
} = require('bfx-report/workers/loc.api/sync/dao/helpers')

const ALLOWED_COLLS = require('../allowed.colls')
const {
  getModelsMap,
  getMethodCollMap
} = require('../schema')
const {
  groupByTimeframe,
  calcGroupedData,
  getMtsGroupedByTimeframe
} = require('./helpers')

const _getLastCandleInTimeframe = (
  data = [],
  symbolFieldName
) => {
  return data.reduce((accum, curr) => {
    const res = {}

    if (
      curr &&
      typeof curr === 'object' &&
      Number.isFinite(curr.close) &&
      typeof curr[symbolFieldName] === 'string' &&
      curr[symbolFieldName].length === 7
    ) {
      const cryptoSymb = curr[symbolFieldName].slice(1, 4)
      const isUsd = curr[symbolFieldName].slice(4, 7) === 'USD'

      if (
        isUsd &&
        Object.keys(accum).every(s => s !== cryptoSymb)
      ) {
        res[cryptoSymb] = curr.close
      }
    }

    return {
      ...accum,
      ...res
    }
  }, {})
}

const _sumObjField = (
  obj,
  fieldName,
  val
) => {
  const _obj = { ...obj }
  const res = Number.isFinite(_obj[fieldName])
    ? _obj[fieldName] + val
    : val

  return {
    ..._obj,
    [fieldName]: res
  }
}

const _calcTradesInTimeframe = (
  data = [],
  symbolFieldName
) => {
  return data.reduce((accum, curr) => {
    if (
      !curr ||
      typeof curr !== 'object' ||
      typeof curr[symbolFieldName] !== 'string' ||
      curr[symbolFieldName].length !== 7 ||
      typeof curr.feeCurrency !== 'string'
    ) {
      return accum
    }

    const cryptoSymb = curr[symbolFieldName].slice(1, 4)
    const forexSymb = curr[symbolFieldName].slice(4, 7)
    const feeSymb = curr.feeCurrency

    if (Number.isFinite(curr.execAmount)) {
      accum[cryptoSymb] = _sumObjField(
        accum[cryptoSymb],
        'execAmount',
        curr.execAmount
      )

      if (Number.isFinite(curr.execPrice)) {
        accum[forexSymb] = _sumObjField(
          accum[forexSymb],
          'execAmount',
          curr.execAmount * curr.execPrice
        )
      }
    }
    if (Number.isFinite(curr.fee)) {
      accum[feeSymb] = _sumObjField(
        accum[feeSymb],
        'fee',
        curr.fee
      )
    }

    return { ...accum }
  }, {})
}

const _isCryptoSymb = (symbs = [], currSymb) => {
  return (
    Array.isArray(symbs) &&
    symbs.every(symb => symb !== currSymb)
  )
}

const _getStartSymbBalancesFromWallets = (wallets) => {
  return wallets.reduce((accum, wallet) => {
    const { currency, balance } = { ...wallet }

    if (
      typeof currency !== 'string' ||
      !Number.isFinite(balance)
    ) {
      return accum
    }
    if (Number.isFinite(accum[currency])) {
      return {
        ...accum,
        [currency]: accum[currency] + balance
      }
    }

    return {
      ...accum,
      [currency]: balance
    }
  }, {})
}

const _getSymbBalances = (
  tradesGroupedByTimeframe = {},
  prevSymbBalances
) => {
  const trades = Object.entries(tradesGroupedByTimeframe)

  return trades.reduce((accum, [symb, trade]) => {
    const { execAmount, fee } = { ...trade }
    const res = {}

    if (Number.isFinite(accum[symb])) {
      const _execAmount = Number.isFinite(execAmount)
        ? execAmount
        : 0
      const _fee = Number.isFinite(fee)
        ? fee
        : 0

      res[symb] = accum[symb] + _execAmount + _fee
    }

    return {
      ...accum,
      ...res
    }
  }, prevSymbBalances)
}

const _searchLastCandleBySymb = (candles, symb) => {
  const candle = {
    ...candles.find(c => Number.isFinite(c[symb]))
  }

  return candle[symb]
}

const _calcTrades = (symbs, wallets) => {
  const candles = []
  let resGroupedBySymb = _getStartSymbBalancesFromWallets(
    wallets
  )

  return (item, i) => {
    const {
      tradesGroupedByTimeframe,
      candlesGroupedByTimeframe
    } = { ...item }

    if (
      candlesGroupedByTimeframe &&
      typeof candlesGroupedByTimeframe === 'object' &&
      Object.keys(candlesGroupedByTimeframe).length > 0
    ) {
      candles.unshift(candlesGroupedByTimeframe)
    }

    if (i !== 0) {
      resGroupedBySymb = _getSymbBalances(
        tradesGroupedByTimeframe,
        resGroupedBySymb
      )
    }

    const arr = Object.entries(resGroupedBySymb)

    return arr.reduce((accum, [symb, val]) => {
      if (_isCryptoSymb(symbs, symb)) {
        const candle = _searchLastCandleBySymb(
          candles,
          symb
        )

        if (!Number.isFinite(candle)) {
          return { ...accum }
        }

        const _cryptoInUsd = val * candle
        const _val = Number.isFinite(accum.USD)
          ? _cryptoInUsd + accum.USD
          : _cryptoInUsd

        return {
          ...accum,
          USD: _val
        }
      }

      return {
        ...accum,
        [symb]: Number.isFinite(accum[symb])
          ? accum[symb] + val
          : val
      }
    }, {})
  }
}

const _getOldestMtsFromWallets = (wallets, start) => {
  const _mts = wallets.reduce((mts, wallet) => {
    const { mtsUpdate } = { ...wallet }

    return min([mts, mtsUpdate])
  }, null)

  return max([_mts, start])
}

module.exports = async (rService, args) => {
  const { dao } = rService
  const {
    // eslint-disable-next-line camelcase
    auth: { _id: user_id },
    params: {
      symbol,
      timeframe,
      start,
      end
    } = {}
  } = { ...args }
  const tradesModel = getModelsMap()
    .get(ALLOWED_COLLS.TRADES)
  const candlesModel = getModelsMap()
    .get(ALLOWED_COLLS.CANDLES)
  const tradesMethodColl = getMethodCollMap()
    .get('_getTrades')
  const candlesMethodColl = getMethodCollMap()
    .get('_getCandles')
  const {
    dateFieldName: tradesDateFieldName,
    symbolFieldName: tradesSymbolFieldName
  } = tradesMethodColl
  const {
    dateFieldName: candlesDateFieldName,
    symbolFieldName: candlesSymbolFieldName
  } = candlesMethodColl

  const wallets = await rService.getWallets(null, {
    auth: { ...args.auth },
    params: { end: start }
  })
  const oldestMtsFromWallets = _getOldestMtsFromWallets(
    wallets,
    start
  )

  const tradesBaseFilter = getInsertableArrayObjectsFilter(
    tradesMethodColl,
    {
      start: oldestMtsFromWallets,
      end
    }
  )
  const candlesBaseFilter = getInsertableArrayObjectsFilter(
    candlesMethodColl,
    {
      start: oldestMtsFromWallets,
      end
    }
  )

  const candles = await dao.getElemsInCollBy(
    ALLOWED_COLLS.CANDLES,
    {
      filter: {
        ...candlesBaseFilter
      },
      sort: [['mts', -1]],
      projection: candlesModel
    }
  )
  const trades = await dao.getElemsInCollBy(
    ALLOWED_COLLS.TRADES,
    {
      filter: {
        ...tradesBaseFilter,
        user_id
      },
      sort: [['mtsCreate', -1]],
      projection: tradesModel,
      exclude: ['user_id'],
      isExcludePrivate: true
    }
  )

  const candlesGroupedByTimeframe = await groupByTimeframe(
    candles,
    timeframe,
    symbol,
    candlesDateFieldName,
    candlesSymbolFieldName,
    _getLastCandleInTimeframe,
    dao
  )
  const tradesGroupedByTimeframe = await groupByTimeframe(
    trades,
    timeframe,
    symbol,
    tradesDateFieldName,
    tradesSymbolFieldName,
    _calcTradesInTimeframe,
    dao
  )
  const mtsGroupedByTimeframe = getMtsGroupedByTimeframe(
    oldestMtsFromWallets,
    end,
    timeframe
  )

  const res = calcGroupedData(
    {
      candlesGroupedByTimeframe,
      tradesGroupedByTimeframe,
      mtsGroupedByTimeframe
    },
    true,
    _calcTrades(symbol, wallets),
    true
  )

  return res
}
