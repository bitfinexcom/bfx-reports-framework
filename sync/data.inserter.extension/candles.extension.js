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
      return { symbol: `t${currency}${this._convertTo}`, start: lastElemLedgers.mts }
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
  }

  /**
   * TODO:
   * @override
   */
  async insertNewData (
    method,
    schema
  ) {
    const args = this.dataInserter._getMethodArgMap(
      method,
      null,
      10000000,
      schema.start
    )
  }
}

module.exports = CandlesExtension
