'use strict'

const { pick } = require('lodash')

const BaseMediatorReportService = require(
  'bfx-report/workers/loc.api/service.report.mediator'
)
const {
  getREST,
  getDateNotMoreNow,
  prepareResponse
} = require('bfx-report/workers/loc.api/helpers')

const {
  checkParams,
  getMethodLimit
} = require('./helpers')
const getRisk = require('./sync/get-risk')

class MediatorReportService extends BaseMediatorReportService {
  async _getCandles (args) {
    try {
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
      const rest = getREST({}, this.ctx.grc_bfx.caller)

      const data = await rest.candles.bind(rest)({ ...params, query })

      const res = prepareResponse(
        data,
        'mts',
        params.limit,
        params.notThrowError,
        params.notCheckNextPage
      )

      return res
    } catch (err) {
      this._err(err, '_getCandles')
    }
  }

  async getRisk (space, args, cb) {
    try {
      // TODO: maybe need to improve
      if (!await this.isSyncModeWithDbData(space, args)) {
        cb(null, { isSyncModeWithoutDbData: true })

        return
      }

      checkParams(args, 'paramsSchemaForRiskApi')

      const res = await getRisk(
        this.dao,
        args
      )

      cb(null, res)
    } catch (err) {
      this._err(err, 'getRisk', cb)
    }
  }
}

module.exports = MediatorReportService
