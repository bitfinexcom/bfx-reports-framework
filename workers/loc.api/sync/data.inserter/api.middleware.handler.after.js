'use strict'

const BaseApiMiddlewareHandlerAfter = require(
  'bfx-report/workers/loc.api/sync/data.inserter/api.middleware.handler.after'
)

class ApiMiddlewareHandlerAfter extends BaseApiMiddlewareHandlerAfter {
  _getCandles (args, apiRes) {
    if (args.params.symbol) {
      const res = apiRes.res.map(item => ({
        ...item,
        _symbol: args.params.symbol
      }))

      return {
        ...apiRes,
        res
      }
    }

    return apiRes
  }
}

module.exports = ApiMiddlewareHandlerAfter
