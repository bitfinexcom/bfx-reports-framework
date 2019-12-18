'use strict'

const moment = require('moment')

const {
  decorate,
  injectable,
  inject
} = require('inversify')
const {
  FindMethodError
} = require('bfx-report/workers/loc.api/errors')
const {
  getDataFromApi
} = require('bfx-report/workers/loc.api/helpers')

const {
  CurrencyConversionDataFindingError
} = require('../../errors')
const {
  splitSymbolPairs,
  isForexSymb
} = require('../helpers')
const TYPES = require('../../di/types')

class CurrencyConverter {
  constructor (
    rService,
    dao,
    syncSchema,
    FOREX_SYMBS,
    ALLOWED_COLLS
  ) {
    this.rService = rService
    this.dao = dao
    this.syncSchema = syncSchema
    this.FOREX_SYMBS = FOREX_SYMBS
    this.ALLOWED_COLLS = ALLOWED_COLLS

    this._COLL_NAMES = {
      PUBLIC_TRADES: 'publicTrades',
      CANDLES: 'candles'
    }
  }

  _isEmptyStr (str) {
    return (
      !str ||
      typeof str !== 'string'
    )
  }

  _getConvertingSymb (symbol) {
    if (typeof symbol !== 'string') {
      return ''
    }
    if (symbol.length < 4) {
      return symbol
    }

    return symbol.replace(/F0$/i, '')
  }

  _getPair (
    item,
    {
      convertTo,
      symbolFieldName
    }
  ) {
    const symbol = this._getConvertingSymb(item[symbolFieldName])
    const separator = symbol.length > 3
      ? ':'
      : ''

    return `t${symbol}${separator}${convertTo}`
  }

  _getPairFromPair (symbol) {
    if (typeof symbol !== 'string') {
      return ''
    }
    if (symbol.length < 8) {
      return symbol
    }
    if (
      symbol[0] !== 't' &&
      symbol[0] !== 'f'
    ) {
      return symbol
    }

    const flag = symbol[0]
    const [firstSymb, lastSymb] = splitSymbolPairs(symbol)
    const _firstSymb = this._getConvertingSymb(firstSymb)
    const _lastSymb = this._getConvertingSymb(lastSymb)
    const separator = (
      _firstSymb.length > 3 ||
      _lastSymb.length > 3
    )
      ? ':'
      : ''

    return `${flag}${_firstSymb}${separator}${_lastSymb}`
  }

  _isRequiredConvFromForex (
    item,
    {
      convertTo,
      symbolFieldName
    }
  ) {
    return this.FOREX_SYMBS
      .filter(s => s !== convertTo)
      .some(s => s === item[symbolFieldName])
  }

  _isRequiredConvToForex (convertTo) {
    return this.FOREX_SYMBS
      .some(s => s === convertTo)
  }

  async _getPublicTradesPrice (
    reqSymb,
    end
  ) {
    if (
      !reqSymb ||
      !Number.isInteger(end)
    ) {
      return null
    }

    const symbol = this._getPairFromPair(reqSymb)
    const { res } = await getDataFromApi(
      this.rService._getPublicTrades.bind(this.rService),
      {
        params: {
          symbol,
          end,
          limit: 1,
          notThrowError: true,
          notCheckNextPage: true
        }
      }
    )

    const publicTrade = Array.isArray(res)
      ? res[0]
      : res
    const { price } = { ...publicTrade }

    return price
  }

  async _getCandleClosedPrice (
    reqSymb,
    end
  ) {
    const candlesSchema = this.syncSchema.getMethodCollMap()
      .get('_getCandles')

    if (
      !reqSymb ||
      !Number.isInteger(end)
    ) {
      return null
    }

    const symbol = this._getPairFromPair(reqSymb)
    const candle = await this.dao.getElemInCollBy(
      candlesSchema.name,
      {
        [candlesSchema.symbolFieldName]: symbol,
        end,
        _dateFieldName: [candlesSchema.dateFieldName]
      },
      candlesSchema.sort
    )
    const { close } = { ...candle }

    return close
  }

  _getPriceMethodName (collName) {
    if (collName === this._COLL_NAMES.CANDLES) {
      return '_getCandleClosedPrice'
    }
    if (collName === this._COLL_NAMES.PUBLIC_TRADES) {
      return '_getPublicTradesPrice'
    }

    throw new FindMethodError()
  }

  _getPriceMethod (collName) {
    const name = this._getPriceMethodName(collName)

    return this[name].bind(this)
  }

  async _getPrice (
    collName = this._COLL_NAMES.CANDLES,
    item,
    {
      convertTo,
      symbolFieldName,
      dateFieldName,
      mts
    }
  ) {
    if (!this._isRequiredConvToForex(convertTo)) {
      return null
    }

    const end = Number.isInteger(mts)
      ? mts
      : item[dateFieldName]
    const isRequiredConvFromForex = this._isRequiredConvFromForex(
      item,
      {
        convertTo,
        symbolFieldName
      }
    )
    const _getPrice = this._getPriceMethod(collName)

    if (isRequiredConvFromForex) {
      const btcPriseIn = await _getPrice(
        `tBTC${item[symbolFieldName]}`,
        end
      )
      const btcPriseOut = await _getPrice(
        `tBTC${convertTo}`,
        end
      )

      if (
        !btcPriseIn ||
        !btcPriseOut ||
        !Number.isFinite(btcPriseIn) ||
        !Number.isFinite(btcPriseOut)
      ) {
        return null
      }

      return btcPriseOut / btcPriseIn
    }

    const price = await _getPrice(
      this._getPair(
        item,
        {
          convertTo,
          symbolFieldName
        }
      ),
      end
    )

    return Number.isFinite(price)
      ? price
      : null
  }

  async _convertBy (
    collName,
    data,
    convSchema
  ) {
    const _convSchema = {
      convertTo: 'USD',
      symbolFieldName: '',
      dateFieldName: '',
      convFields: [{ inputField: '', outputField: '' }],
      ...convSchema
    }
    const {
      convertTo,
      symbolFieldName,
      convFields
    } = _convSchema
    const isArr = Array.isArray(data)
    const elems = isArr
      ? data
      : [data]
    const res = []

    for (const obj of elems) {
      const isNotObj = !obj || typeof obj !== 'object'
      const item = isNotObj ? obj : { ...obj }

      res.push(item)

      if (
        isNotObj ||
        this._isEmptyStr(convertTo) ||
        this._isEmptyStr(symbolFieldName) ||
        this._isEmptyStr(item[symbolFieldName]) ||
        !Array.isArray(convFields) ||
        convFields.length === 0
      ) {
        continue
      }

      const symbol = this._getConvertingSymb(item[symbolFieldName])
      const isSameSymb = convertTo === symbol
      const price = isSameSymb
        ? 1
        : await this._getPrice(
          collName,
          item,
          _convSchema
        )

      if (!Number.isFinite(price)) {
        continue
      }

      convFields.forEach(({ inputField, outputField }) => {
        if (
          this._isEmptyStr(inputField) ||
          this._isEmptyStr(outputField) ||
          !Number.isFinite(item[inputField])
        ) {
          return
        }

        item[outputField] = item[inputField] * price
      })
    }

    return isArr ? res : res[0]
  }

  _findCandlesPrice (
    candles,
    symbol,
    end
  ) {
    const candle = candles.find(({
      mts,
      close,
      _symbol
    }) => (
      symbol === _symbol &&
      Number.isFinite(close) &&
      mts <= end
    ))
    const { close } = { ...candle }

    return close
  }

  _findPublicTradesPrice (
    publicTrades,
    symbol,
    end
  ) {
    const publicTrade = publicTrades.find(({
      mts,
      price,
      _symbol
    }) => (
      symbol === _symbol &&
      Number.isFinite(price) &&
      mts <= end
    ))
    const { price } = { ...publicTrade }

    return price
  }

  _getCandlesPriceFromData (
    candles,
    symbol,
    end
  ) {
    const [firstSymb, lastSymb] = splitSymbolPairs(symbol)

    if (
      firstSymb &&
      firstSymb === lastSymb
    ) {
      return 1
    }

    const _isForexSymb = isForexSymb(
      firstSymb,
      this.FOREX_SYMBS.filter(s => s !== lastSymb)
    )

    if (_isForexSymb) {
      const btcPriseIn = this._findCandlesPrice(
        candles,
        `tBTC${firstSymb}`,
        end
      )
      const btcPriseOut = this._findCandlesPrice(
        candles,
        `tBTC${lastSymb}`,
        end
      )

      if (
        !btcPriseIn ||
        !btcPriseOut ||
        !Number.isFinite(btcPriseIn) ||
        !Number.isFinite(btcPriseOut)
      ) {
        return null
      }

      return btcPriseOut / btcPriseIn
    }

    return this._findCandlesPrice(
      candles,
      symbol,
      end
    )
  }

  _getPublicTradesPriceFromData (
    publicTrades,
    symbol,
    end
  ) {
    const [firstSymb, lastSymb] = splitSymbolPairs(symbol)

    if (
      firstSymb &&
      firstSymb === lastSymb
    ) {
      return 1
    }

    const _isForexSymb = isForexSymb(
      firstSymb,
      this.FOREX_SYMBS.filter(s => s !== lastSymb)
    )

    if (_isForexSymb) {
      const btcPriseIn = this._findPublicTradePrice(
        publicTrades,
        `tBTC${firstSymb}`,
        end
      )
      const btcPriseOut = this._findPublicTradePrice(
        publicTrades,
        `tBTC${lastSymb}`,
        end
      )

      if (
        !btcPriseIn ||
        !btcPriseOut ||
        !Number.isFinite(btcPriseIn) ||
        !Number.isFinite(btcPriseOut)
      ) {
        return null
      }

      return btcPriseOut / btcPriseIn
    }

    return this._findPublicTradePrice(
      publicTrades,
      symbol,
      end
    )
  }

  _getCandles ({
    start: _start = 0,
    end = Date.now(),
    symbol
  }) {
    const mtsMoment = moment.utc(_start)
      .add(-1, 'days')
      .valueOf()
    const start = _start
      ? mtsMoment
      : _start
    const {
      symbolFieldName,
      dateFieldName
    } = this.syncSchema.getMethodCollMap()
      .get('_getCandles')
    const candlesModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.CANDLES)
    const symbFilter = (
      Array.isArray(symbol) &&
      symbol.length !== 0
    )
      ? { $in: { [symbolFieldName]: symbol } }
      : {}

    return this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.CANDLES,
      {
        filter: {
          $lte: { [dateFieldName]: end },
          $gte: { [dateFieldName]: start },
          ...symbFilter
        },
        sort: [[dateFieldName, -1]],
        projection: candlesModel
      }
    )
  }

  _isNotIntStartAndEndMts (elems, dateFieldName) {
    return (
      !Array.isArray(elems) ||
      elems.length === 0 ||
      !elems[0] ||
      !elems[elems.length - 1] ||
      typeof elems[0] !== 'object' ||
      typeof elems[elems.length - 1] !== 'object' ||
      !Number.isInteger(elems[0][dateFieldName]) ||
      !Number.isInteger(elems[elems.length - 1][dateFieldName])
    )
  }

  convertByCandles (data, convSchema) {
    return this._convertBy(
      this._COLL_NAMES.CANDLES,
      data,
      convSchema
    )
  }

  convertByPublicTrades (data, convSchema) {
    return this._convertBy(
      this._COLL_NAMES.PUBLIC_TRADES,
      data,
      convSchema
    )
  }

  /**
   * if api is not available convert by candles
   */
  convert (data, convSchema) {
    try {
      return this.convertByPublicTrades(data, convSchema)
    } catch (err) {
      return this.convertByCandles(data, convSchema)
    }
  }

  /**
   * if api is not available get price from candles
   */
  getPrice (
    reqSymb,
    end
  ) {
    try {
      return this._getPublicTradesPrice(
        reqSymb,
        end
      )
    } catch (err) {
      return this._getCandleClosedPrice(
        reqSymb,
        end
      )
    }
  }

  getPriceFromData (
    reqSymb,
    end,
    {
      candles,
      publicTrades
    }
  ) {
    const symbol = this._getPairFromPair(reqSymb)

    if (Array.isArray(candles)) {
      return this._getCandlesPriceFromData(
        candles,
        symbol,
        end
      )
    }
    if (Array.isArray(publicTrades)) {
      return this._getPublicTradesPriceFromData(
        publicTrades,
        symbol,
        end
      )
    }

    throw new CurrencyConversionDataFindingError()
  }

  async convertManyByCandles (data, convSchema) {
    const _convSchema = {
      convertTo: 'USD',
      symbolFieldName: '',
      dateFieldName: '',
      convFields: [{ inputField: '', outputField: '' }],
      ...convSchema
    }
    const {
      convertTo,
      symbolFieldName,
      dateFieldName,
      convFields
    } = _convSchema
    const isArr = Array.isArray(data)
    const elems = isArr
      ? data
      : [data]

    if (
      !Array.isArray(convFields) ||
      convFields.length === 0 ||
      this._isEmptyStr(convertTo) ||
      this._isEmptyStr(symbolFieldName) ||
      this._isEmptyStr(dateFieldName) ||
      this._isNotIntStartAndEndMts(elems, dateFieldName)
    ) {
      return data
    }

    const end = elems[0][dateFieldName]
    const start = elems[elems.length - 1][dateFieldName]

    const candles = await this._getCandles({ start, end })

    const res = []

    for (const obj of elems) {
      const isNotObj = !obj || typeof obj !== 'object'
      const item = isNotObj ? obj : { ...obj }

      res.push(item)

      if (
        isNotObj ||
        this._isEmptyStr(item[symbolFieldName]) ||
        !Number.isInteger(item[dateFieldName])
      ) {
        continue
      }

      const _symbol = splitSymbolPairs(item[symbolFieldName])[1]
      const symbol = this._getConvertingSymb(_symbol)
      const isSameSymb = convertTo === symbol
      const price = isSameSymb
        ? 1
        : this._getCandlesPriceFromData(
          candles,
          `t${symbol}${convertTo}`,
          item[dateFieldName]
        )

      if (!Number.isFinite(price)) {
        continue
      }

      convFields.forEach(({ inputField, outputField }) => {
        if (
          this._isEmptyStr(inputField) ||
          this._isEmptyStr(outputField) ||
          !Number.isFinite(item[inputField])
        ) {
          return
        }

        item[outputField] = item[inputField] * price
      })
    }

    return isArr ? res : res[0]
  }
}

decorate(injectable(), CurrencyConverter)
decorate(inject(TYPES.RService), CurrencyConverter, 0)
decorate(inject(TYPES.DAO), CurrencyConverter, 1)
decorate(inject(TYPES.SyncSchema), CurrencyConverter, 2)
decorate(inject(TYPES.FOREX_SYMBS), CurrencyConverter, 3)
decorate(inject(TYPES.ALLOWED_COLLS), CurrencyConverter, 4)

module.exports = CurrencyConverter
