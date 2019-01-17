'use strict'

const { pick } = require('lodash')

const schema = require('./schema')
const { getMethodLimit } = require('./helpers')

class Responder {
  constructor (wrk, core) {
    this.wrk = wrk
    this.core = core
    this.reportService = wrk.ctx.api_bfx
    this.logger = wrk.logger
  }

  async getCandles (methodName = 'getCandles', args, cb) {
    try {
      this.core.checkParams(
        args,
        'paramsSchemaForCandlesApi',
        ['timeframe', 'symbol', 'section'],
        schema
      )

      const params = args.params && typeof args.params === 'object'
        ? args.params
        : {}
      params.end = this.core.getDateNotMoreNow(params.end)
      params.limit = getMethodLimit(
        this.core.getMethodLimit,
        params.limit,
        'candles'
      )
      const query = pick(params, [
        'limit',
        'start',
        'end',
        'sort'
      ])
      const rest = this.core.getREST(args.auth, this.wrk)

      const data = await rest.candles.bind(rest)({ ...params, query })

      const res = this.core.prepareResponse(
        data,
        'mts',
        params.limit,
        params.notThrowError,
        params.notCheckNextPage
      )

      if (!cb) return res
      cb(null, res)
    } catch (err) {
      this.core.logError(this.logger, err, methodName, cb)
    }
  }
}

module.exports = Responder
