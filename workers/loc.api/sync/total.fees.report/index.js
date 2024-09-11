'use strict'

const { merge } = require('lib-js-util-base')

const {
  TotalFeesParamsFlagError
} = require('../../errors')
const {
  calcGroupedData,
  groupByTimeframe
} = require('../helpers')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.ALLOWED_COLLS,
  TYPES.SyncSchema,
  TYPES.FOREX_SYMBS,
  TYPES.Authenticator,
  TYPES.SYNC_API_METHODS
]
class TotalFeesReport {
  constructor (
    dao,
    ALLOWED_COLLS,
    syncSchema,
    FOREX_SYMBS,
    authenticator,
    SYNC_API_METHODS
  ) {
    this.dao = dao
    this.ALLOWED_COLLS = ALLOWED_COLLS
    this.syncSchema = syncSchema
    this.FOREX_SYMBS = FOREX_SYMBS
    this.authenticator = authenticator
    this.SYNC_API_METHODS = SYNC_API_METHODS

    this.ledgersMethodColl = this.syncSchema.getMethodCollMap()
      .get(this.SYNC_API_METHODS.LEDGERS)
    this.ledgersModelFields = this.syncSchema
      .getModelOf(this.ALLOWED_COLLS.LEDGERS)
      .getModelFields()
  }

  async getTotalFeesReport (args = {}) {
    const {
      auth,
      params
    } = args ?? {}
    const {
      start = 0,
      end = Date.now(),
      timeframe = 'day',
      symbol: symbs
    } = params ?? {}
    const _symbol = Array.isArray(symbs)
      ? symbs
      : [symbs]
    const symbol = _symbol.filter((s) => (
      s && typeof s === 'string'
    ))
    const filter = this._getLedgersFilter(params)
    const _args = {
      auth,
      start,
      end,
      symbol,
      filter
    }

    const ledgers = await this._getLedgers(_args)

    const {
      dateFieldName: ledgersDateFieldName,
      symbolFieldName: ledgersSymbolFieldName
    } = this.ledgersMethodColl

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

  async _getLedgers ({
    auth,
    start,
    end,
    symbol,
    filter,
    projection = this.ledgersModelFields
  }) {
    const user = await this.authenticator
      .verifyRequestUser({ auth })

    const symbFilter = (
      Array.isArray(symbol) &&
      symbol.length !== 0
    )
      ? { $in: { currency: symbol } }
      : {}
    const filterToSkipNotRecalcedBalance = user.isSubAccount
      ? { _isBalanceRecalced: 1 }
      : {}
    const _filter = merge(filter, symbFilter)

    return this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.LEDGERS,
      {
        filter: {
          ..._filter,
          user_id: user._id,
          $lte: { mts: end },
          $gte: { mts: start },
          ...filterToSkipNotRecalcedBalance
        },
        sort: [['mts', -1]],
        projection,
        exclude: ['user_id'],
        isExcludePrivate: true
      }
    )
  }

  _getLedgersFilter (params) {
    const {
      isTradingFees,
      isFundingFees
    } = params ?? {}

    if (
      !isTradingFees &&
      !isFundingFees
    ) {
      throw new TotalFeesParamsFlagError()
    }

    const _category = []

    /*
     * Considering 'category' filter
     * https://docs.bitfinex.com/reference/rest-auth-ledgers
     * workers/loc.api/sync/data.inserter/api.middleware/helpers/get-category-from-description.js
     */
    if (isTradingFees) {
      _category.push(201) // trading fee
    }
    if (isFundingFees) {
      _category.push(
        27, // position funding cost or interest charged
        226, // used margin funding charge
        228, // unused margin funding fee
        29 // derivatives funding event
      )
    }

    return { $in: { _category } }
  }

  _calcLedgers () {
    return (data = []) => {
      const res = data.reduce((accum, curr) => {
        const { amountUsd } = curr ?? {}

        if (!Number.isFinite(amountUsd)) {
          return accum
        }

        const _amountUsd = amountUsd !== 0
          ? amountUsd * -1
          : amountUsd
        accum.USD = Number.isFinite(accum.USD)
          ? accum.USD + _amountUsd
          : _amountUsd

        return accum
      }, {})

      return res
    }
  }

  _getLedgersByTimeframe () {
    let cumulative = 0

    return ({ ledgersGroupedByTimeframe = {} }) => {
      cumulative = this._calcPrevAmount(
        ledgersGroupedByTimeframe,
        cumulative
      )

      return {
        cumulative,
        USD: ledgersGroupedByTimeframe.USD ?? 0
      }
    }
  }

  _calcPrevAmount (usdAmount, cumulative) {
    const { USD: amount } = usdAmount ?? {}
    const _cumulative = Number.isFinite(cumulative)
      ? cumulative
      : 0

    return Number.isFinite(amount)
      ? amount + _cumulative
      : _cumulative
  }
}

decorateInjectable(TotalFeesReport, depsTypes)

module.exports = TotalFeesReport
