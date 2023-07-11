'use strict'

const {
  FindMethodError
} = require('bfx-report/workers/loc.api/errors')

const { decorateInjectable } = require('../../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.RService,
  TYPES.ApiMiddlewareHandlerAfter
]
class ApiMiddleware {
  constructor (
    rService,
    apiMiddlewareHandlerAfter
  ) {
    this.rService = rService
    this.apiMiddlewareHandlerAfter = apiMiddlewareHandlerAfter
  }

  hasMethod (method) {
    return typeof this.rService[method] === 'function'
  }

  _hasHandlerAfter (method) {
    return typeof this.apiMiddlewareHandlerAfter[method] === 'function'
  }

  async request (method, args, opts) {
    const { shouldNotApiMiddlewareBeLaunched } = opts ?? {}
    const apiRes = await this._requestToReportService(method, args)

    if (shouldNotApiMiddlewareBeLaunched) {
      return apiRes
    }

    const res = await this._after(method, args, apiRes, opts)

    return res
  }

  _requestToReportService (method, args) {
    if (!this.hasMethod(method)) {
      throw new FindMethodError()
    }

    const fn = this.rService[method].bind(this.rService)

    return fn(args)
  }

  _after (method, args, apiRes, opts) {
    if (!this._hasHandlerAfter(method)) {
      return apiRes
    }

    const fn = this.apiMiddlewareHandlerAfter[method].bind(
      this.apiMiddlewareHandlerAfter
    )

    return fn(args, apiRes, opts)
  }
}

decorateInjectable(ApiMiddleware, depsTypes)

module.exports = ApiMiddleware
