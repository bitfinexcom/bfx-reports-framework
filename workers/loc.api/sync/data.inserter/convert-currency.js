'use strict'

const { getMethodCollMap } = require('../schema')
const ALLOWED_COLLS = require('../allowed.colls')

const _getConvSchema = () => {
  return new Map([
    [
      ALLOWED_COLLS.LEDGERS,
      {
        symbolFieldName: 'currency',
        dateFieldName: 'mts',
        convFields: [
          { inputField: 'amount', outputField: 'amountUsd' },
          { inputField: 'balance', outputField: 'balanceUsd' }
        ]
      }
    ]
  ])
}

module.exports = async ({
  dao,
  candlesAllowedSymbs,
  convertTo,
  syncColls
}) => {
  if (syncColls.every(name => (
    name !== ALLOWED_COLLS.ALL &&
    name !== ALLOWED_COLLS.CANDLES
  ))) {
    return
  }

  const candlesSchema = getMethodCollMap().get('_getCandles')
  const convSchema = _getConvSchema()

  for (const [collName, schema] of convSchema) {
    let count = 0
    let _id = 0

    while (true) {
      count += 1

      if (count > 100) break

      const elems = await dao.getElemsInCollBy(
        collName,
        {
          filter: {
            [schema.symbolFieldName]: candlesAllowedSymbs,
            $gt: { _id },
            $isNull: schema.convFields.map(obj => obj.outputField)
          },
          sort: [['_id', 1]],
          limit: 10000
        }
      )

      if (!Array.isArray(elems) || elems.length === 0) {
        break
      }

      for (const item of elems) {
        const candle = await dao.getElemInCollBy(
          candlesSchema.name,
          {
            [candlesSchema.symbolFieldName]: `t${item[schema.symbolFieldName]}${convertTo}`,
            end: item[schema.dateFieldName],
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

        schema.convFields.forEach(({ inputField, outputField }) => {
          if (
            item[inputField] &&
            Number.isFinite(item[inputField])
          ) {
            item[outputField] = item[inputField] * candle.close
          }
        })
      }

      await dao.updateElemsInCollBy(
        collName,
        elems,
        ['_id'],
        schema.convFields.map(({ outputField }) => outputField)
      )

      _id = elems[elems.length - 1]._id
    }
  }
}
