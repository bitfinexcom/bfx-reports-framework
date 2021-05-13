'use strict'

const { CONVERT_TO } = require('../const')
const DataInserterHook = require('./data.inserter.hook')

const { decorateInjectable } = require('../../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.CurrencyConverter,
  TYPES.ALLOWED_COLLS
]
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
  async execute (names = []) {
    const _names = Array.isArray(names)
      ? names
      : [names]
    const { syncColls } = this._opts

    if (syncColls.every(name => (
      name !== this.ALLOWED_COLLS.ALL &&
      name !== this.ALLOWED_COLLS.CANDLES &&
      name !== this.ALLOWED_COLLS.LEDGERS
    ))) {
      return
    }

    const convSchema = this._getConvSchema()

    for (const [collName, schema] of convSchema) {
      if (_names.length > 0) {
        const isSkipped = _names.every((name) => (
          !name ||
          name !== collName
        ))

        if (isSkipped) continue
      }

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
              convertTo: CONVERT_TO,
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

decorateInjectable(ConvertCurrencyHook, depsTypes)

module.exports = ConvertCurrencyHook
