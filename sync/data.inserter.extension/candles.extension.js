'use strict'

const { isEmpty } = require('lodash')

const DataInserterExtension = require('./data.inserter.extension')

class CandlesExtension extends DataInserterExtension {
  constructor () {
    super()

    this._allowedSymbs = ['BTC', 'ETH']
    this._timeframe = '1D'
    this._section = 'hist'
    this._convertTo = 'USD'
  }

  /**
   * @override
   */
  async checkNewData (
    method,
    schema
  ) {
    schema.hasNewData = false

    const symbFieldName = schema.symbolFieldName
    const lastElemLedgers = await this.dao.getElemInCollBy(
      this.ALLOWED_COLLS.LEDGERS,
      { currency: this._allowedSymbs },
      [['mts', 1]]
    )

    if (
      !lastElemLedgers ||
      typeof lastElemLedgers !== 'object' ||
      !Number.isInteger(lastElemLedgers.mts)
    ) {
      return
    }

    const uniqueLedgersSymbs = await this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.LEDGERS,
      {
        filter: { currency: this._allowedSymbs },
        isDistinct: true,
        projection: ['currency']
      }
    )

    if (
      !Array.isArray(uniqueLedgersSymbs) ||
      uniqueLedgersSymbs.length === 0
    ) {
      return
    }

    const collСonfig = uniqueLedgersSymbs.map(({ currency }) => {
      return {
        symbol: `t${currency}${this._convertTo}`,
        start: lastElemLedgers.mts
      }
    })

    for (const { symbol, start } of collСonfig) {
      const args = this.dataInserter._getMethodArgMap(method, {}, 1)
      args.params = {
        ...args.params,
        timeframe: this._timeframe,
        section: this._section,
        notThrowError: true,
        notCheckNextPage: true,
        symbol
      }
      const filter = { [symbFieldName]: symbol }
      const lastElemFromDb = await this.dao.getElemInCollBy(
        schema.name,
        filter,
        schema.sort
      )
      const {
        res: lastElemFromApi
      } = await this.dataInserter._getDataFromApi(method, args)

      if (
        isEmpty(lastElemFromApi) ||
        (
          Array.isArray(lastElemFromApi) &&
          lastElemFromApi[0][symbFieldName] &&
          typeof lastElemFromApi[0][symbFieldName] === 'string' &&
          lastElemFromApi[0][symbFieldName] !== symbol
        )
      ) {
        continue
      }
      if (isEmpty(lastElemFromDb)) {
        schema.hasNewData = true
        schema.start.push([symbol, { currStart: start }])

        continue
      }

      const lastDateInDb = this.dataInserter._compareElemsDbAndApi(
        schema.dateFieldName,
        lastElemFromDb,
        lastElemFromApi
      )

      const startConf = {
        baseStartFrom: null,
        baseStartTo: null,
        currStart: null
      }

      if (lastDateInDb) {
        schema.hasNewData = true
        startConf.currStart = lastDateInDb + 1
      }

      const firstElemFromDb = await this.dao.getElemInCollBy(
        schema.name,
        filter,
        this.dataInserter._invertSort(schema.sort)
      )

      if (!isEmpty(firstElemFromDb)) {
        const isChangedBaseStart = this.dataInserter._compareElemsDbAndApi(
          schema.dateFieldName,
          { [schema.dateFieldName]: start },
          firstElemFromDb
        )

        if (isChangedBaseStart) {
          schema.hasNewData = true
          startConf.baseStartFrom = start
          startConf.baseStartTo = firstElemFromDb[schema.dateFieldName] - 1
        }
      }

      schema.start.push([symbol, startConf])
    }

    if (!schema.hasNewData) {
      await this._convertCurrency(schema)
    }
  }

  /**
   * @override
   */
  async insertNewData (
    method,
    schema
  ) {
    for (const [symbol, dates] of schema.start) {
      await this.dataInserter._insertConfigurablePublicApiData(
        method,
        schema,
        symbol,
        dates,
        {
          timeframe: this._timeframe,
          section: this._section
        },
        (itemRes, params) => {
          if (typeof params.symbol === 'string') {
            itemRes._symbol = params.symbol
          }
        }
      )
    }

    await this._convertCurrency(schema)
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
            { inputField: 'balance', outputField: 'balanceUsd' }
          ]
        }

      ]
    ])
  }

  async _convertCurrency (candlesSchema) {
    const convSchema = this._getConvSchema()

    for (const [collName, schema] of convSchema) {
      let count = 0
      let _id = 0

      while (true) {
        count += 1

        if (count > 100) break

        const elems = await this.dao.getElemsInCollBy(
          collName,
          {
            filter: {
              [schema.symbolFieldName]: this._allowedSymbs,
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
          const candle = await this.dao.getElemInCollBy(
            candlesSchema.name,
            {
              [candlesSchema.symbolFieldName]: `t${item[schema.symbolFieldName]}${this._convertTo}`,
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

        await this.dao.updateElemsInCollBy(
          collName,
          elems,
          ['_id'],
          schema.convFields.map(({ outputField }) => outputField)
        )

        _id = elems[elems.length - 1]._id
      }
    }
  }
}

module.exports = CandlesExtension
