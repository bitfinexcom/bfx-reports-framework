'use strict'

class RateLimitChecker {
  constructor (conf) {
    this.rateLimit = conf?.rateLimit ?? 10
    this.msPeriod = conf?.msPeriod ?? 60000

    this._calls = []
  }

  clearOldCalls (mts = Date.now()) {
    const min = mts - this.msPeriod

    while (this._calls[0] && this._calls[0] < min) {
      this._calls.shift()
    }
  }

  add () {
    const mts = Date.now()

    this.clearOldCalls(mts)
    this._calls.push(mts)
  }

  getLength () {
    this.clearOldCalls()

    return this._calls.length
  }

  check () {
    return this.getLength() >= this.rateLimit
  }
}

module.exports = RateLimitChecker
