'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')
const {
  calcGroupedData,
  groupByTimeframe,
  getStartMtsByTimeframe
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

  _calcPercsArr (percs) {
    if (
      !Array.isArray(percs) ||
      percs.length === 0 ||
      percs.some((item) => !Number.isFinite(item))
    ) {
      return null
    }

    const total = percs.reduce((accum, item) => {
      return accum + item
    }, 0)

    return total / percs.length
  }

  _isSameDay (prevMts, mts) {
    return getStartMtsByTimeframe(prevMts, 'day') === getStartMtsByTimeframe(mts, 'day')
  }

  _calcPerc (amount, balance) {
    if (
      !Number.isFinite(amount) ||
      !Number.isFinite(balance)
    ) {
      return 0
    }

    return (amount / balance) * 365 * 100
  }

  _calcDailyPercs (data) {
    let prevMts = 0

    const percsGroupedByDays = data.reduce(
      (accum, ledger = {}) => {
        const { amount, balance, mts } = { ...ledger }

        if (
          accum.length !== 0 &&
          this._isSameDay(prevMts, mts)
        ) {
          accum[accum.length - 1].push(
            this._calcPerc(amount, balance)
          )
          prevMts = mts

          return accum
        }

        accum.push([this._calcPerc(amount, balance)])
        prevMts = mts

        return accum
      },
      []
    )

    return percsGroupedByDays.map((percs) => {
      return this._calcPercsArr(percs)
    })
  }

  _calcLedgers () {
    return (data = []) => {
      const res = data.reduce((accum, ledger = {}) => {
        const { amountUsd } = { ...ledger }

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
      const dailyPercs = this._calcDailyPercs(data)

      return {
        ...res,
        dailyPercs
      }
    }
  }

  _calcAmountPerc (ledgersGroupedByTimeframe) {
    const { dailyPercs = [] } = {
      ...ledgersGroupedByTimeframe
    }

    return this._calcPercsArr(dailyPercs)
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

  _getLedgersByTimeframe () {
    let cumulative = 0

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
      const perc = this._calcAmountPerc(ledgersGroupedByTimeframe)
      cumulative = this._calcPrevAmount(res, cumulative)

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

    const ledgers = await this._getLedgers(args)

    const {
      dateFieldName: ledgersDateFieldName,
      symbolFieldName: ledgersSymbolFieldName
    } = this.tradesMethodColl

    const ledgersGroupedByTimeframe = await groupByTimeframe(
      ledgers,
      { timeframe, start, end },
      this.FOREX_SYMBS,
      ledgersDateFieldName,
      ledgersSymbolFieldName,
      this._calcLedgers()
    )

    const groupedData = await calcGroupedData(
      { ledgersGroupedByTimeframe },
      false,
      this._getLedgersByTimeframe(),
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
