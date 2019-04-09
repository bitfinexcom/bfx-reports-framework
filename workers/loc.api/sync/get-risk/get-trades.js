'use strict'

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
      const symb = curr[symbolFieldName].slice(1, 4)
      const isUsd = curr[symbolFieldName].slice(4, 7)

      if (
        isUsd &&
        Object.keys(accum).every(s => s !== symb)
      ) {
        res[symb] = curr.close
      }
    }

    return {
      ...accum,
      ...res
    }
  }, {})
}

const _sumObjField = (
  obj = {},
  symb,
  fieldName,
  val
) => {
  const res = (
    obj[symb] &&
    typeof obj[symb] === 'object' &&
    Number.isFinite(obj[symb][fieldName])
  )
    ? obj[symb][fieldName] + val
    : val

  return {
    ...obj[symb],
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
        accum,
        cryptoSymb,
        'execAmount',
        curr.execAmount
      )

      if (Number.isFinite(curr.execPrice)) {
        accum[forexSymb] = _sumObjField(
          accum,
          forexSymb,
          'execAmount',
          curr.execAmount * curr.execPrice
        )
      }
    }
    if (Number.isFinite(curr.fee)) {
      accum[feeSymb] = _sumObjField(
        accum,
        feeSymb,
        'fee',
        curr.fee
      )
    }

    return { ...accum }
  }, {})
}

// TODO:
const _calcTrades = (symbol, wallets) => {
  return (item, i, arr, accum) => {
  }
}

const _getOldestMtsFromWallets = (wallets, start) => {
  return wallets.reduce((mts, wallet) => {
    const { mtsUpdate } = { ...wallet }

    return mtsUpdate > mts
      ? mtsUpdate
      : mts
  }, start)
}

// TODO:
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
  const exWallets = wallets.filter(w => w.type === 'exchange')
  const oldestMtsFromWallets = _getOldestMtsFromWallets(exWallets, start)

  const tradesBaseFilter = getInsertableArrayObjectsFilter(
    tradesMethodColl,
    {
      oldestMtsFromWallets,
      end
    }
  )
  const candlesBaseFilter = getInsertableArrayObjectsFilter(
    candlesMethodColl,
    {
      oldestMtsFromWallets,
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
    _calcTrades(symbol, exWallets),
    true
  )

  return res
}
