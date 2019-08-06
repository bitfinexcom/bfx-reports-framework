'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

class CurrencyConverter {
  constructor (
    dao,
    syncSchema,
    FOREX_SYMBS
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
    this.FOREX_SYMBS = FOREX_SYMBS
  }

  _isEmptyStr (str) {
    return (
      !str ||
      typeof str !== 'string'
    )
  }

  _getCandlesSymb (
    item,
    {
      convertTo,
      symbolFieldName
    }
  ) {
    return `t${item[symbolFieldName]}${convertTo}`
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

  async _getCandleClosedPrice (
    candlesSymb,
    end
  ) {
    const candlesSchema = this.syncSchema.getMethodCollMap()
      .get('_getCandles')

    if (
      !candlesSymb ||
      !Number.isInteger(end)
    ) {
      return null
    }

    const candle = await this.dao.getElemInCollBy(
      candlesSchema.name,
      {
        [candlesSchema.symbolFieldName]: candlesSymb,
        end,
        _dateFieldName: [candlesSchema.dateFieldName]
      },
      candlesSchema.sort
    )
    const { close } = { ...candle }

    return close
  }

  async _getPrice (
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

    if (isRequiredConvFromForex) {
      const btcPriseIn = await this._getCandleClosedPrice(
        `tBTC${item[symbolFieldName]}`,
        end
      )
      const btcPriseOut = await this._getCandleClosedPrice(
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

    const close = await this._getCandleClosedPrice(
      this._getCandlesSymb(
        item,
        {
          convertTo,
          symbolFieldName
        }
      ),
      end
    )

    return Number.isFinite(close)
      ? close
      : null
  }

  async convertByCandles (data, convSchema) {
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

      const price = await this._getPrice(
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
}

decorate(injectable(), CurrencyConverter)
decorate(inject(TYPES.DAO), CurrencyConverter, 0)
decorate(inject(TYPES.SyncSchema), CurrencyConverter, 1)
decorate(inject(TYPES.FOREX_SYMBS), CurrencyConverter, 2)

module.exports = CurrencyConverter
