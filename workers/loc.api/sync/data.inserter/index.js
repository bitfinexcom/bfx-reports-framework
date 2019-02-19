'use strict'

const { isEmpty } = require('lodash')

const BaseDataInserter = require(
  'bfx-report/workers/loc.api/sync/data.inserter'
)
const ApiMiddleware = require(
  'bfx-report/workers/loc.api/sync/data.inserter/api.middleware'
)

const ApiMiddlewareHandlerAfter = require('./api.middleware.handler.after')
const { getMethodCollMap } = require('../schema')
const ALLOWED_COLLS = require('../allowed.colls')

class DataInserter extends BaseDataInserter {
  constructor (
    reportService,
    syncColls = ALLOWED_COLLS.ALL
  ) {
    const apiMiddlewareHandlerAfter = new ApiMiddlewareHandlerAfter(
      reportService,
      reportService.dao
    )
    const apiMiddleware = new ApiMiddleware(
      reportService,
      reportService.dao,
      apiMiddlewareHandlerAfter
    )
    const methodCollMap = getMethodCollMap()
    super(
      reportService,
      syncColls,
      methodCollMap,
      ALLOWED_COLLS,
      apiMiddleware
    )

    this._candlesAllowedSymbs = ['BTC', 'ETH']
    this._candlesTimeframe = '1D'
    this._candlesSection = 'hist'
    this._convertTo = 'USD'
  }

  /**
   * @override
   */
  async _checkItemNewDataArrObjType (
    method,
    schema,
    auth
  ) {
    if (schema.name === ALLOWED_COLLS.CANDLES) {
      await this._checkNewCandlesData(method, schema)

      return
    }

    await super._checkItemNewDataArrObjType(
      method,
      schema,
      auth
    )
  }

  /**
   * @override
   */
  async _insertApiDataPublicArrObjTypeToDb (
    methodApi,
    schema
  ) {
    await super._insertApiDataPublicArrObjTypeToDb(
      methodApi,
      schema
    )

    if (!this._isInsertableArrObjTypeOfColl(schema, true)) {
      return
    }
    if (schema.name === ALLOWED_COLLS.CANDLES) {
      await this._insertNewCandlesData(
        methodApi,
        schema
      )
    }
  }

  async _checkNewCandlesData (
    method,
    schema
  ) {
    schema.hasNewData = false

    const symbFieldName = schema.symbolFieldName
    const lastElemLedgers = await this.dao.getElemInCollBy(
      ALLOWED_COLLS.LEDGERS,
      { currency: this._candlesAllowedSymbs },
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
      ALLOWED_COLLS.LEDGERS,
      {
        filter: { currency: this._candlesAllowedSymbs },
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
      const args = this._getMethodArgMap(method, {}, 1)
      args.params = {
        ...args.params,
        timeframe: this._candlesTimeframe,
        section: this._candlesSection,
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
      } = await this._getDataFromApi(method, args)

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

      const lastDateInDb = this._compareElemsDbAndApi(
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
        this._invertSort(schema.sort)
      )

      if (!isEmpty(firstElemFromDb)) {
        const isChangedBaseStart = this._compareElemsDbAndApi(
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

  async _insertNewCandlesData (
    method,
    schema
  ) {
    for (const [symbol, dates] of schema.start) {
      await this._insertConfigurablePublicApiData(
        method,
        schema,
        symbol,
        dates,
        {
          timeframe: this._candlesTimeframe,
          section: this._candlesSection
        }
      )
    }

    await this._convertCurrency(schema)
  }

  _getConvSchema () {
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
              [schema.symbolFieldName]: this._candlesAllowedSymbs,
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

module.exports = DataInserter
