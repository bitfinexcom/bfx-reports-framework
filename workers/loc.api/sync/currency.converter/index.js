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
    syncSchema
  ) {
    this.dao = dao
    this.syncSchema = syncSchema
  }

  _isEmptyStr (str) {
    return (
      !str ||
      typeof str !== 'string'
    )
  }

  _getCandlesSymbFn (
    item,
    {
      convertTo,
      symbolFieldName
    }
  ) {
    return `t${item[symbolFieldName]}${convertTo}`
  }

  async convertByCandles (data, convSchema) {
    const _convSchema = {
      convertTo: 'USD',
      symbolFieldName: '',
      dateFieldName: '',
      convFields: [{ inputField: '', outputField: '' }],
      getCandlesSymbFn: this._getCandlesSymbFn,
      ...convSchema
    }
    const {
      convertTo,
      symbolFieldName,
      dateFieldName,
      mts,
      convFields,
      getCandlesSymbFn
    } = _convSchema
    const candlesSchema = this.syncSchema.getMethodCollMap()
      .get('_getCandles')
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

      const candlesSymb = getCandlesSymbFn(item, _convSchema)
      const end = Number.isInteger(mts)
        ? mts
        : item[dateFieldName]

      if (
        !candlesSymb ||
        !Number.isInteger(end)
      ) {
        continue
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

      if (
        !candle ||
        typeof candle !== 'object' ||
        !candle.close ||
        !Number.isFinite(candle.close)
      ) {
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

        item[outputField] = item[inputField] * candle.close
      })
    }

    return isArr ? res : res[0]
  }
}

decorate(injectable(), CurrencyConverter)
decorate(inject(TYPES.DAO), CurrencyConverter, 0)
decorate(inject(TYPES.SyncSchema), CurrencyConverter, 1)

module.exports = CurrencyConverter
