'use strict'

const { isEmpty } = require('lodash')

const BaseDataInserter = require(
  'bfx-report/workers/loc.api/sync/data.inserter'
)
const ApiMiddleware = require(
  'bfx-report/workers/loc.api/sync/data.inserter/api.middleware'
)
const {
  invertSort,
  compareElemsDbAndApi
} = require('bfx-report/workers/loc.api/sync/data.inserter/helpers')

const ApiMiddlewareHandlerAfter = require('./api.middleware.handler.after')
const { getMethodCollMap } = require('../schema')
const ALLOWED_COLLS = require('../allowed.colls')
const convertCurrency = require('./convert-currency')

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

    this.candlesSkippedSymbs = ['EUR', 'JPY', 'GBP', 'USD']
    this.convertTo = 'USD'

    this._candlesTimeframe = '1D'
    this._candlesSection = 'hist'

    this.addAfterAllInsertsHooks(convertCurrency)
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
      { $not: { currency: this.candlesSkippedSymbs } },
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
        filter: { $not: { currency: this.candlesSkippedSymbs } },
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
        symbol: `t${currency}${this.convertTo}`,
        start: lastElemLedgers.mts
      }
    })

    for (const { symbol, start: _start } of collСonfig) {
      const params = {
        timeframe: this._candlesTimeframe,
        section: this._candlesSection,
        notThrowError: true,
        notCheckNextPage: true,
        symbol
      }
      const _argsForLastElem = this._getMethodArgMap(method, {}, 1)
      const argsForLastElem = {
        ..._argsForLastElem,
        params: {
          ..._argsForLastElem.params,
          ...params
        }
      }
      const _argsForReceivingStart = this._getMethodArgMap(
        method,
        {},
        1,
        0,
        _start
      )
      const argsForReceivingStart = {
        ..._argsForReceivingStart,
        params: {
          ..._argsForReceivingStart.params,
          ...params
        }
      }

      const filter = { [symbFieldName]: symbol }
      const lastElemFromDb = await this.dao.getElemInCollBy(
        schema.name,
        filter,
        schema.sort
      )
      const {
        res: lastElemFromApi
      } = await this._getDataFromApi(method, argsForLastElem)
      const {
        res: startElemFromApi
      } = await this._getDataFromApi(method, argsForReceivingStart)

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

      const start = (
        Array.isArray(startElemFromApi) &&
        startElemFromApi[startElemFromApi.length - 1] &&
        typeof startElemFromApi[startElemFromApi.length - 1] === 'object' &&
        Number.isInteger(
          startElemFromApi[startElemFromApi.length - 1][schema.dateFieldName]
        )
      )
        ? startElemFromApi[startElemFromApi.length - 1][schema.dateFieldName]
        : _start

      if (isEmpty(lastElemFromDb)) {
        schema.hasNewData = true
        schema.start.push([symbol, { currStart: start }])

        continue
      }

      const lastDateInDb = compareElemsDbAndApi(
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
        invertSort(schema.sort)
      )

      if (!isEmpty(firstElemFromDb)) {
        const isChangedBaseStart = compareElemsDbAndApi(
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
  }
}

module.exports = DataInserter
