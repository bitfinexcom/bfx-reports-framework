'use strict'

const { pick } = require('lodash')
const BaseReportService = require(
  'bfx-report/workers/loc.api/service.report'
)
const {
  getDateNotMoreNow
} = require('bfx-report/workers/loc.api/helpers')

const {
  checkParams,
  getMethodLimit
} = require('./helpers')

class ReportService extends BaseReportService {
  _getTickersHistory (args) {
    return super.getTickersHistory(null, args)
  }

  _getPositionsHistory (args) {
    return super.getPositionsHistory(null, args)
  }

  _getLedgers (args) {
    return super.getLedgers(null, args)
  }

  _getTrades (args) {
    return super.getTrades(null, args)
  }

  _getFundingTrades (args) {
    return super.getFundingTrades(null, args)
  }

  _getPublicTrades (args) {
    return super.getPublicTrades(null, args)
  }

  _getOrders (args) {
    return super.getOrders(null, args)
  }

  _getMovements (args) {
    return super.getMovements(null, args)
  }

  _getFundingOfferHistory (args) {
    return super.getFundingOfferHistory(null, args)
  }

  _getFundingLoanHistory (args) {
    return super.getFundingLoanHistory(null, args)
  }

  _getFundingCreditHistory (args) {
    return super.getFundingCreditHistory(null, args)
  }

  async _getCandles (args) {
    return this._responder(async () => {
      checkParams(
        args,
        'paramsSchemaForCandlesApi',
        ['timeframe', 'symbol', 'section']
      )

      const params = (
        args.params &&
        typeof args.params === 'object'
      )
        ? args.params
        : {}
      params.end = getDateNotMoreNow(params.end)
      params.limit = getMethodLimit(
        params.limit,
        'candles'
      )
      const query = pick(params, [
        'limit',
        'start',
        'end',
        'sort'
      ])
      const rest = this._getREST({}, this.ctx.grc_bfx.caller)

      const data = await rest.candles({ ...params, query })

      return this._prepareResponse(
        data,
        'mts',
        params.limit,
        params.notThrowError,
        params.notCheckNextPage
      )
    }, '_getCandles')
  }
}

module.exports = ReportService
