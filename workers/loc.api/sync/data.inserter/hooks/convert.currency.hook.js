'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../../di/types')
const DataInserterHook = require('./data.inserter.hook')

class ConvertCurrencyHook extends DataInserterHook {
  constructor (
    dao,
    currencyConverter,
    ALLOWED_COLLS
  ) {
    super()

    this.dao = dao
    this.currencyConverter = currencyConverter
    this.ALLOWED_COLLS = ALLOWED_COLLS
  }

  _getConvSchema () {
    return new Map([
      [
        this.ALLOWED_COLLS.LEDGERS,
        {
          symbolFieldName: 'currency',
          dateFieldName: 'mts',
          convFields: [
            { inputField: 'amount', outputField: 'amountUsd' },
            {
              inputField: '_nativeBalance',
              outputField: ['balanceUsd', '_nativeBalanceUsd']
            }
          ]
        }
      ],
      [
        this.ALLOWED_COLLS.MOVEMENTS,
        {
          symbolFieldName: 'currency',
          dateFieldName: 'mtsUpdated',
          convFields: [
            { inputField: 'amount', outputField: 'amountUsd' }
          ]
        }
      ]
    ])
  }

  /**
   * @override
   */
  async execute () {
    const {
      convertTo,
      syncColls
    } = this._opts

    if (syncColls.every(name => (
      name !== this.ALLOWED_COLLS.ALL &&
      name !== this.ALLOWED_COLLS.CANDLES
    ))) {
      return
    }

    const convSchema = this._getConvSchema()

    for (const [collName, schema] of convSchema) {
      let count = 0
      let _id = 0

      const { convFields } = { ...schema }
      const updatedFieldNames = convFields
        .reduce((accum, { outputField }) => {
          const _outputField = Array.isArray(outputField)
            ? outputField
            : [outputField]

          accum.push(..._outputField)

          return accum
        }, [])

      while (true) {
        count += 1

        if (count > 100) break

        const elems = await this.dao.getElemsInCollBy(
          collName,
          {
            filter: {
              $gt: { _id },
              $isNull: updatedFieldNames
            },
            sort: [['_id', 1]],
            limit: 10000
          }
        )

        if (!Array.isArray(elems) || elems.length === 0) {
          break
        }

        const convElems = await this.currencyConverter
          .convertByCandles(
            elems,
            {
              convertTo,
              ...schema
            }
          )

        await this.dao.updateElemsInCollBy(
          collName,
          convElems,
          ['_id'],
          updatedFieldNames
        )

        _id = elems[elems.length - 1]._id
      }
    }
  }
}

decorate(injectable(), ConvertCurrencyHook)
decorate(inject(TYPES.DAO), ConvertCurrencyHook, 0)
decorate(inject(TYPES.CurrencyConverter), ConvertCurrencyHook, 1)
decorate(inject(TYPES.ALLOWED_COLLS), ConvertCurrencyHook, 2)

module.exports = ConvertCurrencyHook
