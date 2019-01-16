'use strict'

class Responder {
  constructor (wrk, core) {
    this.wrk = wrk
    this.core = core
    this.reportService = wrk.ctx.api_bfx
  }

  // TODO:
  async getCandles (args, cb) {
    try {
      const params = args.params || {}
      const rest = this.core.getREST(args.auth, this.wrk)

      const data = await rest.candles.bind(rest)(params)

      const res = this.core.prepareResponse(
        data,
        'mts',
        500,
        params.notThrowError,
        params.notCheckNextPage
      )

      if (!cb) return res
      cb(null, res)
    } catch (err) {
      this._err(err, '_getCandles', cb)
    }
  }
}

module.exports = Responder
