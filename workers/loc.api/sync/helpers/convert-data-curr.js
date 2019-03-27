'use strict'

const { getMethodCollMap } = require('../schema')

const _isEmptyStr = (str) => (
  !str ||
  typeof str !== 'string'
)

const _getCandlesSymbFn = (
  item,
  {
    convertTo,
    symbolFieldName
  }
) => (
  `t${item[symbolFieldName]}${convertTo}`
)

module.exports = async (dao, data, convSchema) => {
  const _convSchema = {
    convertTo: 'USD',
    symbolFieldName: '',
    dateFieldName: '',
    convFields: [{ inputField: '', outputField: '', checkFn: () => true }],
    getCandlesSymbFn: _getCandlesSymbFn,
    ...convSchema
  }
  const {
    convertTo,
    symbolFieldName,
    dateFieldName,
    convFields,
    getCandlesSymbFn
  } = _convSchema
  const candlesSchema = getMethodCollMap().get('_getCandles')
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
      _isEmptyStr(convertTo) ||
      _isEmptyStr(symbolFieldName) ||
      _isEmptyStr(dateFieldName) ||
      _isEmptyStr(item[symbolFieldName]) ||
      !Number.isInteger(item[dateFieldName]) ||
      !Array.isArray(convFields) ||
      convFields.length === 0
    ) {
      continue
    }

    const candle = await dao.getElemInCollBy(
      candlesSchema.name,
      {
        [candlesSchema.symbolFieldName]: getCandlesSymbFn(item, _convSchema),
        end: item[dateFieldName],
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

    convFields.forEach(({ inputField, outputField, checkFn = () => true }) => {
      if (
        _isEmptyStr(inputField) ||
        _isEmptyStr(outputField) ||
        !Number.isFinite(item[inputField]) ||
        !checkFn(item, inputField, outputField, candle.close)
      ) {
        return
      }

      item[outputField] = item[inputField] * candle.close
    })
  }

  return isArr ? res : res[0]
}
