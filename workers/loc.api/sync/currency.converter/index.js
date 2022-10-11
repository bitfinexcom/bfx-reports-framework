'use strict'

const moment = require('moment')
const { orderBy } = require('lodash')

const {
  FindMethodError
} = require('bfx-report/workers/loc.api/errors')
const {
  splitSymbolPairs
} = require('bfx-report/workers/loc.api/helpers')

const {
  CurrencyConversionDataFindingError
} = require('../../errors')
const {
  isForexSymb
} = require('../helpers')
const { tryParseJSON } = require('../../helpers')
const SyncTempTablesManager = require(
  '../data.inserter/sync.temp.tables.manager'
)

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.RService,
  TYPES.DAO,
  TYPES.SyncSchema,
  TYPES.FOREX_SYMBS,
  TYPES.ALLOWED_COLLS,
  TYPES.SYNC_API_METHODS
]
class CurrencyConverter {
  constructor (
    rService,
    dao,
    syncSchema,
    FOREX_SYMBS,
    ALLOWED_COLLS,
    SYNC_API_METHODS
  ) {
    this.rService = rService
    this.dao = dao
    this.syncSchema = syncSchema
    this.FOREX_SYMBS = FOREX_SYMBS
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.SYNC_API_METHODS = SYNC_API_METHODS

    this._COLL_NAMES = {
      PUBLIC_TRADES: 'publicTrades',
      CANDLES: 'candles'
    }
    this.candlesTimeframe = '1D'
    this.candlesSchema = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.CANDLES)

    this.currenciesUpdatedAt = new Date()
    this.currencies = []
    this.currenciesSynonymous = new Map()

    this._getPublicTrades = this.rService[this.SYNC_API_METHODS.PUBLIC_TRADES]
      .bind(this.rService)
  }

  async getCurrenciesSynonymous () {
    const mtsDiff = new Date() - this.currenciesUpdatedAt

    if (
      mtsDiff < (20 * 60 * 1000) &&
      Array.isArray(this.currencies) &&
      this.currencies.length > 0
    ) {
      return this.currenciesSynonymous
    }

    this.currencies = await this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.CURRENCIES
    )

    if (
      !Array.isArray(this.currencies) ||
      this.currencies.length === 0
    ) {
      try {
        this.currencies = await this.rService._getCurrencies()

        if (
          !Array.isArray(this.currencies) ||
          this.currencies.length === 0
        ) {
          return this.currenciesSynonymous
        }
      } catch (err) {
        return this.currenciesSynonymous
      }
    }

    this.currenciesUpdatedAt = new Date()

    this.currenciesSynonymous = this.currencies
      .reduce((accum, curr) => {
        const { id, walletFx } = { ...curr }
        const _walletFx = Array.isArray(walletFx)
          ? walletFx
          : tryParseJSON(walletFx)

        if (
          !id ||
          typeof id !== 'string' ||
          !Array.isArray(_walletFx) ||
          _walletFx.length === 0
        ) {
          return accum
        }

        const filteredWalletFx = _walletFx.filter((item) => (
          Array.isArray(item) &&
          item.length > 1 &&
          item[0] &&
          typeof item[0] === 'string' &&
          Number.isFinite(item[1])
        ))

        if (filteredWalletFx.length > 0) {
          accum.set(id, filteredWalletFx)
        }

        return accum
      }, new Map())

    return this.currenciesSynonymous
  }

  getCurrenciesSynonymousIfEmpty (currenciesSynonymous) {
    return (
      currenciesSynonymous instanceof Map &&
      currenciesSynonymous.size > 0
    )
      ? currenciesSynonymous
      : this.getCurrenciesSynonymous()
  }

  _getSynonymous (
    symbol,
    currenciesSynonymous
  ) {
    if (
      !(currenciesSynonymous instanceof Map) ||
      currenciesSynonymous.size === 0
    ) {
      return
    }

    const [firstSymb, lastSymb = ''] = splitSymbolPairs(symbol)
    const prefix = (
      symbol[0] === 't' ||
      symbol[0] === 'f'
    )
      ? symbol[0]
      : ''
    const synonymous = currenciesSynonymous.get(firstSymb)

    if (!synonymous) {
      return
    }

    return synonymous.reduce((accum, [symbol, conversion]) => {
      const separator = (
        symbol &&
        lastSymb &&
        (
          symbol.length > 3 ||
          lastSymb.length > 3
        )
      )
        ? ':'
        : ''

      accum.push([
        `${prefix}${symbol}${separator}${lastSymb}`,
        conversion
      ])

      if (
        symbol.length >= 4 &&
        /F0$/i.test(symbol)
      ) {
        const _symbol = this._getConvertingSymb(symbol)
        const _separator = (
          _symbol &&
          lastSymb &&
          (
            _symbol.length > 3 ||
            lastSymb.length > 3
          )
        )
          ? ':'
          : ''

        accum.push([
          `${prefix}${_symbol}${_separator}${lastSymb}`,
          conversion
        ])
      }

      return accum
    }, [])
  }

  async _priceFinder (
    finderFn,
    reqSymb,
    currenciesSynonymous
  ) {
    const symbol = this._getPairFromPair(reqSymb)
    const price = await finderFn(symbol)

    if (Number.isFinite(price)) {
      return price
    }

    const _currenciesSynonymous = await this
      .getCurrenciesSynonymousIfEmpty(currenciesSynonymous)
    const synonymous = this._getSynonymous(
      symbol,
      _currenciesSynonymous
    )

    if (!synonymous) {
      return null
    }

    for (const [symbol, conversion] of synonymous) {
      const price = await finderFn(symbol)

      if (
        Number.isFinite(price) &&
        Number.isFinite(conversion)
      ) {
        return price * conversion
      }
    }

    return null
  }

  _syncPriceFinder (
    finderFn,
    reqSymb,
    currenciesSynonymous = new Map()
  ) {
    const symbol = this._getPairFromPair(reqSymb)
    const price = finderFn(symbol)

    if (Number.isFinite(price)) {
      return price
    }

    const synonymous = this._getSynonymous(
      symbol,
      currenciesSynonymous
    )

    if (!synonymous) {
      return null
    }

    for (const [symbol, conversion] of synonymous) {
      const price = finderFn(symbol)

      if (
        Number.isFinite(price) &&
        Number.isFinite(conversion)
      ) {
        return price * conversion
      }
    }

    return null
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
    const { res } = await this._getPublicTrades({
      params: {
        symbol,
        end,
        limit: 1,
        notThrowError: true,
        notCheckNextPage: true
      }
    })

    const publicTrade = Array.isArray(res)
      ? res[0]
      : res
    const { price } = { ...publicTrade }

    return price
  }

  async _getCandleClosedPrice (
    reqSymb,
    end,
    opts
  ) {
    if (
      !reqSymb ||
      !Number.isInteger(end)
    ) {
      return null
    }

    const {
      shouldTempTablesBeIncluded
    } = opts ?? {}

    const symbol = this._getPairFromPair(reqSymb)
    const candle = await this.dao.getElemInCollBy(
      this.candlesSchema.name,
      {
        [this.candlesSchema.symbolFieldName]: symbol,
        end,
        _dateFieldName: [this.candlesSchema.dateFieldName]
      },
      this.candlesSchema.sort
    )

    if (!shouldTempTablesBeIncluded) {
      return candle?.close
    }

    const tempTableNamePattern = SyncTempTablesManager.getTempTableName(
      this.candlesSchema.name,
      '\\d+'
    )
    const regExp = new RegExp(tempTableNamePattern)

    const tableNames = await this.dao.getTablesNames()
    const tempTableNames = tableNames.filter((name) => (
      regExp.test(name)
    ))
    const candles = Number.isInteger(candle?.[this.candlesSchema.dateFieldName])
      ? [candle]
      : []

    for (const candlesTempTableName of tempTableNames) {
      const candleFromTempTable = await this.dao.getElemInCollBy(
        candlesTempTableName,
        {
          [this.candlesSchema.symbolFieldName]: symbol,
          end,
          _dateFieldName: [this.candlesSchema.dateFieldName]
        },
        this.candlesSchema.sort
      )

      if (Number.isInteger(candleFromTempTable?.[this.candlesSchema.dateFieldName])) {
        candles.push(candleFromTempTable)
      }
    }

    if (candles.length === 0) {
      return null
    }

    const orderedCandles = orderBy(
      candles,
      [this.candlesSchema.dateFieldName],
      ['desc']
    )

    return orderedCandles[0]?.close
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
      mts,
      shouldTempTablesBeIncluded
    }
  ) {
    const end = Number.isInteger(mts)
      ? mts
      : item[dateFieldName]
    const isRequiredConvToForex = this._isRequiredConvToForex(convertTo)
    const isRequiredConvFromForex = this._isRequiredConvFromForex(
      item,
      {
        convertTo,
        symbolFieldName
      }
    )
    const _getPrice = this._getPriceMethod(collName)

    if (isRequiredConvFromForex) {
      const btcPriceIn = await _getPrice(
        `tBTC${item[symbolFieldName]}`,
        end,
        { shouldTempTablesBeIncluded }
      )
      const btcPriceOut = await _getPrice(
        `tBTC${convertTo}`,
        end,
        { shouldTempTablesBeIncluded }
      )

      if (
        !btcPriceIn ||
        !btcPriceOut ||
        !Number.isFinite(btcPriceIn) ||
        !Number.isFinite(btcPriceOut)
      ) {
        return null
      }

      return btcPriceOut / btcPriceIn
    }
    if (!isRequiredConvToForex) {
      const usdPriceIn = await _getPrice(
        `t${item[symbolFieldName]}USD`,
        end,
        { shouldTempTablesBeIncluded }
      )
      const usdPriceOut = await _getPrice(
        `t${convertTo}USD`,
        end,
        { shouldTempTablesBeIncluded }
      )

      if (
        !usdPriceIn ||
        !usdPriceOut ||
        !Number.isFinite(usdPriceIn) ||
        !Number.isFinite(usdPriceOut)
      ) {
        return null
      }

      return usdPriceIn / usdPriceOut
    }

    const price = await _getPrice(
      this._getPair(
        item,
        {
          convertTo,
          symbolFieldName
        }
      ),
      end,
      { shouldTempTablesBeIncluded }
    )

    return Number.isFinite(price)
      ? price
      : null
  }

  _isEmptyOutputField (outputField) {
    return (
      !Array.isArray(outputField) ||
      outputField.length === 0 ||
      outputField.some((field) => this._isEmptyStr(field))
    )
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
      currenciesSynonymous: new Map(),
      ...convSchema
    }

    const currenciesSynonymous = await this
      .getCurrenciesSynonymousIfEmpty(_convSchema.currenciesSynonymous)

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
        : await this._priceFinder(
          (symb) => this._getPrice(
            collName,
            {
              ...item,
              [symbolFieldName]: symb
            },
            _convSchema
          ),
          symbol,
          currenciesSynonymous
        )

      if (!Number.isFinite(price)) {
        continue
      }

      convFields.forEach(({ inputField, outputField }) => {
        const _outputField = Array.isArray(outputField)
          ? outputField
          : [outputField]

        if (
          this._isEmptyStr(inputField) ||
          this._isEmptyOutputField(_outputField) ||
          !Number.isFinite(item[inputField])
        ) {
          return
        }

        for (const fieldName of _outputField) {
          item[fieldName] = item[inputField] * price
        }
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
      const btcPriceIn = this._findCandlesPrice(
        candles,
        `tBTC${firstSymb}`,
        end
      )
      const btcPriceOut = this._findCandlesPrice(
        candles,
        `tBTC${lastSymb}`,
        end
      )

      if (
        !btcPriceIn ||
        !btcPriceOut ||
        !Number.isFinite(btcPriceIn) ||
        !Number.isFinite(btcPriceOut)
      ) {
        return null
      }

      return btcPriceOut / btcPriceIn
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
      const btcPriceIn = this._findPublicTradesPrice(
        publicTrades,
        `tBTC${firstSymb}`,
        end
      )
      const btcPriceOut = this._findPublicTradesPrice(
        publicTrades,
        `tBTC${lastSymb}`,
        end
      )

      if (
        !btcPriceIn ||
        !btcPriceOut ||
        !Number.isFinite(btcPriceIn) ||
        !Number.isFinite(btcPriceOut)
      ) {
        return null
      }

      return btcPriceOut / btcPriceIn
    }

    return this._findPublicTradesPrice(
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
      dateFieldName,
      timeframeFieldName
    } = this.candlesSchema
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
          $eq: { [timeframeFieldName]: this.candlesTimeframe },
          $lte: { [dateFieldName]: end },
          $gte: { [dateFieldName]: start },
          ...symbFilter
        },
        sort: [[dateFieldName, -1]],
        projection: ['mts', 'close', '_symbol']
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

  _selectConvertWay (
    data,
    convSchema,
    opts = {}
  ) {
    const {
      shouldTryPublicTradesFirst = false
    } = opts

    if (shouldTryPublicTradesFirst) {
      return this.convertByPublicTrades(data, convSchema)
    }

    return this.convertByCandles(data, convSchema)
  }

  _selectGettingPriceWay (
    reqSymb,
    mts,
    opts = {}
  ) {
    const {
      shouldTryPublicTradesFirst = false
    } = opts

    if (shouldTryPublicTradesFirst) {
      return this._getPublicTradesPrice(
        reqSymb,
        mts
      )
    }

    return this._priceFinder(
      async (symbol) => {
        const [firstSymb, lastSymb] = splitSymbolPairs(symbol)

        const res = await this._getPrice(
          this._COLL_NAMES.CANDLES,
          { symbol: firstSymb },
          {
            convertTo: lastSymb,
            symbolFieldName: 'symbol',
            mts
          }
        )

        return res
      },
      reqSymb
    )
  }

  /*
   * If api is not available convert by bypass way
   */
  async convert (
    data,
    convSchema,
    opts = {}
  ) {
    const {
      shouldTryPublicTradesFirst = false
    } = opts

    try {
      const res = await this._selectConvertWay(
        data,
        convSchema,
        { shouldTryPublicTradesFirst }
      )

      return res
    } catch (err) {
      const res = await this._selectConvertWay(
        data,
        convSchema,
        { shouldTryPublicTradesFirst: !shouldTryPublicTradesFirst }
      )

      return res
    }
  }

  /*
   * If api is not available get price from bypass way
   */
  async getPrice (
    reqSymb,
    mts,
    opts = {}
  ) {
    const {
      shouldTryPublicTradesFirst = false
    } = opts

    try {
      const price = await this._selectGettingPriceWay(
        reqSymb,
        mts,
        { shouldTryPublicTradesFirst }
      )

      return price
    } catch (err) {
      const price = await this._selectGettingPriceWay(
        reqSymb,
        mts,
        { shouldTryPublicTradesFirst: !shouldTryPublicTradesFirst }
      )

      if (Number.isFinite(price)) {
        return price
      }

      throw err
    }
  }

  getPriceFromData (
    reqSymb,
    end,
    {
      candles,
      publicTrades,
      currenciesSynonymous
    }
  ) {
    if (Array.isArray(candles)) {
      return this._syncPriceFinder(
        (symb) => this._getCandlesPriceFromData(
          candles,
          symb,
          end
        ),
        reqSymb,
        currenciesSynonymous
      )
    }
    if (Array.isArray(publicTrades)) {
      return this._syncPriceFinder(
        (symb) => this._getPublicTradesPriceFromData(
          publicTrades,
          symb,
          end
        ),
        reqSymb,
        currenciesSynonymous
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
      currenciesSynonymous: new Map(),
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

    const currenciesSynonymous = await this
      .getCurrenciesSynonymousIfEmpty(_convSchema.currenciesSynonymous)
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
        : await this._priceFinder(
          (symb) => this._getCandlesPriceFromData(
            candles,
            symb,
            item[dateFieldName]
          ),
          `t${symbol}${convertTo}`,
          currenciesSynonymous
        )

      if (!Number.isFinite(price)) {
        continue
      }

      convFields.forEach(({ inputField, outputField }) => {
        const _outputField = Array.isArray(outputField)
          ? outputField
          : [outputField]

        if (
          this._isEmptyStr(inputField) ||
          this._isEmptyOutputField(_outputField) ||
          !Number.isFinite(item[inputField])
        ) {
          return
        }

        for (const fieldName of _outputField) {
          item[fieldName] = item[inputField] * price
        }
      })
    }

    return isArr ? res : res[0]
  }
}

decorateInjectable(CurrencyConverter, depsTypes)

module.exports = CurrencyConverter
