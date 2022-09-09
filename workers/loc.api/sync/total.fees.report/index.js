'use strict'

const {
  TotalFeesParamsFlagError
} = require('../../errors')
const {
  calcGroupedData,
  groupByTimeframe,
  getStartMtsByTimeframe
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
    this.ledgersModel = this.syncSchema.getModelsMap()
      .get(this.ALLOWED_COLLS.LEDGERS)
  }

  // TODO:
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
  }

  async _getLedgers ({
    auth,
    start,
    end,
    symbol,
    filter,
    projection = this.ledgersModel
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

    return this.dao.getElemsInCollBy(
      this.ALLOWED_COLLS.LEDGERS,
      {
        filter: {
          ...filter,
          user_id: user._id,
          $lte: { mts: end },
          $gte: { mts: start },
          ...symbFilter,
          ...filterToSkipNotRecalcedBalance
        },
        sort: [['mts', -1]],
        projection,
        exclude: ['user_id'],
        isExcludePrivate: true
      }
    )
  }

  // TODO:
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
  }
}

decorateInjectable(TotalFeesReport, depsTypes)

module.exports = TotalFeesReport
