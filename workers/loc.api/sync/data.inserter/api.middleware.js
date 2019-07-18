'use strict'

const {
  FindMethodError
} = require('bfx-report/workers/loc.api/errors')
const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

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

  async request (method, args, isCheckCall = false) {
    const apiRes = await this._requestToReportService(method, args)
    const res = await this._after(method, args, apiRes, isCheckCall)

    return res
  }

  _requestToReportService (method, args) {
    if (!this.hasMethod(method)) {
      throw new FindMethodError()
    }

    const fn = this.rService[method].bind(this.rService)

    return fn(args)
  }

  _after (method, args, apiRes, isCheckCall) {
    if (!this._hasHandlerAfter(method)) {
      return apiRes
    }

    const fn = this.apiMiddlewareHandlerAfter[method].bind(
      this.apiMiddlewareHandlerAfter
    )

    return fn(args, apiRes, isCheckCall)
  }
}

decorate(injectable(), ApiMiddleware)
decorate(inject(TYPES.RService), ApiMiddleware, 0)
decorate(inject(TYPES.ApiMiddlewareHandlerAfter), ApiMiddleware, 1)

module.exports = ApiMiddleware
