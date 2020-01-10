'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')
const {
  calcGroupedData,
  groupByTimeframe
} = require('../helpers')

class PerformingLoan {
  constructor (
    dao,
    ALLOWED_COLLS,
    syncSchema,
    FOREX_SYMBS
  ) {
    this.dao = dao
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.syncSchema = syncSchema
    this.FOREX_SYMBS = FOREX_SYMBS

    this.tradesMethodColl = this.syncSchema.getMethodCollMap()
      .get('_getLedgers')
  }

  async _getLedgers ({
    auth,
    start,
    end,
    symbol,
    filter = {
      $eq: { _isMarginFundingPayment: 1 }
    }
  }) {
    const user = await this.dao.checkAuthInDb({ auth })

    const symbFilter = (
      Array.isArray(symbol) &&
      symbol.length !== 0
    )
      ? { $in: { currency: symbol } }
      : {}
    const ledgersModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.LEDGERS)

    return this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.LEDGERS,
      {
        filter: {
          ...filter,
          user_id: user._id,
          $lte: { mts: end },
          $gte: { mts: start },
          ...symbFilter
        },
        sort: [['mts', -1]],
        projection: ledgersModel,
        exclude: ['user_id'],
        isExcludePrivate: true
      }
    )
  }

  _calcLedgers () {
    return (data = []) => data.reduce((accum, trade = {}) => {
      const { amountUsd } = { ...trade }

      if (!Number.isFinite(amountUsd)) {
        return { ...accum }
      }

      return {
        ...accum,
        USD: Number.isFinite(accum.USD)
          ? accum.USD + amountUsd
          : amountUsd
      }
    }, {})
  }

  _calcAmountPerc (res, amountForAllYear) {
    const { USD: amount } = { ...res }

    return (
      Number.isFinite(amount) &&
      Number.isFinite(amountForAllYear) &&
      amountForAllYear !== 0
    )
      ? (amount / amountForAllYear) * 100
      : null
  }

  _calcPrevAmount (res, cumulative) {
    const { USD: amount } = { ...res }

    return (
      Number.isFinite(amount) &&
      Number.isFinite(cumulative)
    )
      ? amount + cumulative
      : cumulative
  }

  _amountForAllYear (mts, amountsGroupedByYear = []) {
    if (
      !Number.isInteger(mts) ||
      !Array.isArray(amountsGroupedByYear) ||
      amountsGroupedByYear.length === 0
    ) {
      return null
    }

    const amountObj = amountsGroupedByYear.find((item) => {
      const { mts: amountMts } = { ...item }

      if (!Number.isInteger(mts)) {
        return false
      }

      const year = (new Date(mts)).getUTCFullYear()
      const amountYear = (new Date(amountMts)).getUTCFullYear()

      return year === amountYear
    })
    const { vals: { USD: amount } = {} } = { ...amountObj }

    return amount
  }

  _getLedgersByTimeframe (amountsGroupedByYear = []) {
    let _cumulative = 0

    return ({ ledgersGroupedByTimeframe = {}, mts }) => {
      const ledgersArr = Object.entries(ledgersGroupedByTimeframe)
      const res = ledgersArr.reduce((
        accum,
        [symb, amount]
      ) => {
        if (
          symb !== 'USD' ||
          !Number.isFinite(amount)
        ) {
          return { ...accum }
        }

        return {
          ...accum,
          [symb]: amount
        }
      }, {})
      const amountForAllYear = this._amountForAllYear(
        mts,
        amountsGroupedByYear
      )
      const perc = this._calcAmountPerc(res, amountForAllYear)
      const cumulative = _cumulative
      _cumulative = this._calcPrevAmount(res, cumulative)

      return {
        cumulative,
        perc,
        ...res
      }
    }
  }

  async getPerformingLoan (
    {
      auth = {},
      params = {}
    } = {}
  ) {
    const {
      start = 0,
      end = Date.now(),
      timeframe = 'day',
      symbol: symbs
    } = { ...params }
    const _symbol = Array.isArray(symbs)
      ? symbs
      : [symbs]
    const symbol = _symbol.filter((s) => (
      s && typeof s === 'string'
    ))
    const args = {
      auth,
      start,
      end,
      symbol
    }
    const startYear = (new Date(start)).getUTCFullYear()
    const endYear = (new Date(end)).getUTCFullYear()

    const ledgers = await this._getLedgers(args)
    const fundingWalletLedgers = await this._getLedgers({
      ...args,
      start: Date.UTC(startYear),
      end: Date.UTC(endYear + 1) - 1,
      filter: {
        $eq: { wallet: 'funding' }
      }
    })

    const {
      dateFieldName: ledgersDateFieldName,
      symbolFieldName: ledgersSymbolFieldName
    } = this.tradesMethodColl

    const ledgersGroupedByTimeframe = await groupByTimeframe(
      ledgers,
      timeframe,
      this.FOREX_SYMBS,
      ledgersDateFieldName,
      ledgersSymbolFieldName,
      this._calcLedgers()
    )
    const amountsGroupedByYear = await groupByTimeframe(
      fundingWalletLedgers,
      'year',
      this.FOREX_SYMBS,
      ledgersDateFieldName,
      ledgersSymbolFieldName,
      this._calcLedgers()
    )

    const groupedData = await calcGroupedData(
      { ledgersGroupedByTimeframe },
      false,
      this._getLedgersByTimeframe(amountsGroupedByYear),
      true
    )

    return groupedData
  }
}

decorate(injectable(), PerformingLoan)
decorate(inject(TYPES.DAO), PerformingLoan, 0)
decorate(inject(TYPES.ALLOWED_COLLS), PerformingLoan, 1)
decorate(inject(TYPES.SyncSchema), PerformingLoan, 2)
decorate(inject(TYPES.FOREX_SYMBS), PerformingLoan, 3)

module.exports = PerformingLoan
