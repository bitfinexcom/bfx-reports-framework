'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')
const {
  calcGroupedData,
  groupByTimeframe
} = require('../helpers')

class TradedVolume {
  constructor (
    dao,
    ALLOWED_COLLS,
    syncSchema,
    FOREX_SYMBS,
    currencyConverter
  ) {
    this.dao = dao
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.syncSchema = syncSchema
    this.FOREX_SYMBS = FOREX_SYMBS
    this.currencyConverter = currencyConverter
  }

  async _getTrades ({
    auth,
    start,
    end,
    symbol
  }) {
    const user = await this.dao.checkAuthInDb({ auth })

    const symbFilter = (
      Array.isArray(symbol) &&
      symbol.length !== 0
    )
      ? { $in: { symbol } }
      : {}
    const tradesModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.TRADES)

    return this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.TRADES,
      {
        filter: {
          user_id: user._id,
          $lte: { mtsCreate: end },
          $gte: { mtsCreate: start },
          ...symbFilter
        },
        sort: [['mtsCreate', -1]],
        projection: tradesModel,
        exclude: ['user_id'],
        isExcludePrivate: true
      }
    )
  }

  _calcTrades (data = []) {
    return data.reduce((accum, trade = {}) => {
      const { amountUsd } = { ...trade }

      if (!Number.isFinite(amountUsd)) {
        return { ...accum }
      }

      return {
        ...accum,
        USD: Number.isFinite(accum.USD)
          ? accum.USD + amountUsd
          : amountUsd
      }
    }, {})
  }

  _calcTradesAmount (data = []) {
    return data.map((trade = {}) => {
      const { execAmount, execPrice } = { ...trade }

      if (
        !Number.isFinite(execAmount) ||
        !Number.isFinite(execPrice)
      ) {
        return {
          ...trade,
          calcAmount: null
        }
      }

      return {
        ...trade,
        calcAmount: Math.abs(execAmount * execPrice)
      }
    }, {})
  }

  _getTradesByTimeframe () {
    return ({ tradesGroupedByTimeframe = {} }) => {
      const tradesArr = Object.entries(tradesGroupedByTimeframe)
      const res = tradesArr.reduce((
        accum,
        [symb, amount]
      ) => {
        if (
          symb !== 'USD' ||
          !Number.isFinite(amount)
        ) {
          return { ...accum }
        }

        return {
          ...accum,
          [symb]: amount
        }
      }, {})

      return res
    }
  }

  async getTradedVolume (
    {
      auth = {},
      params = {}
    } = {}
  ) {
    const {
      timeframe = 'day',
      start = 0,
      end = Date.now(),
      symbol: symbs
    } = { ...params }
    const _symbol = Array.isArray(symbs)
      ? symbs
      : [symbs]
    const symbol = _symbol.filter((s) => (
      s && typeof s === 'string'
    ))
    const args = {
      auth,
      start,
      end,
      symbol
    }

    const tradesMethodColl = this.syncSchema.getMethodCollMap()
      .get('_getTrades')
    const {
      symbolFieldName: tradesSymbolFieldName,
      dateFieldName: tradesDateFieldName
    } = tradesMethodColl

    const trades = await this._getTrades(args)
    const calcedTradesAmount = this._calcTradesAmount(
      trades,
      tradesSymbolFieldName
    )
    const convertedTrades = await this.currencyConverter
      .convertManyByCandles(
        calcedTradesAmount,
        {
          symbolFieldName: tradesSymbolFieldName,
          dateFieldName: tradesDateFieldName,
          convFields: [{
            inputField: 'calcAmount',
            outputField: 'amountUsd'
          }]
        }
      )
    const tradesGroupedByTimeframe = await groupByTimeframe(
      convertedTrades,
      timeframe,
      this.FOREX_SYMBS,
      'mtsCreate',
      tradesSymbolFieldName,
      this._calcTrades.bind(this)
    )

    const groupedData = await calcGroupedData(
      { tradesGroupedByTimeframe },
      false,
      this._getTradesByTimeframe(),
      true
    )

    return groupedData
  }
}

decorate(injectable(), TradedVolume)
decorate(inject(TYPES.DAO), TradedVolume, 0)
decorate(inject(TYPES.ALLOWED_COLLS), TradedVolume, 1)
decorate(inject(TYPES.SyncSchema), TradedVolume, 2)
decorate(inject(TYPES.FOREX_SYMBS), TradedVolume, 3)
decorate(inject(TYPES.CurrencyConverter), TradedVolume, 4)

module.exports = TradedVolume
