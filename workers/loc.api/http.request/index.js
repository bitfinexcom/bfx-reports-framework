'use strict'

const { RESTv2 } = require('bfx-api-node-rest')

const {
  makeRequestToBFX
} = require('./helpers')

const { decorateInjectable } = require('../di/utils')

const depsTypes = (TYPES) => [
  TYPES.CONF
]
class HTTPRequest {
  constructor (
    conf
  ) {
    this.conf = conf

    this._TEST_REST_URL = 'http://localhost:9999'
    this._isTestEnv = process.env.NODE_ENV === 'test'

    this._transportCache = new Map()
    this.getRequest() // Init default cache
  }

  getRequest (opts = {}) {
    const key = JSON.stringify(opts)

    const _opts = {
      transform: true,
      url: this._isTestEnv
        ? this._TEST_REST_URL
        : this.conf?.restUrl,
      ...opts
    }

    if (this._transportCache.has(key)) {
      return this._transportCache.get(key)
    }

    const rest = new ExpandedRESTv2(_opts)
    this._transportCache.set(key, rest)

    return rest
  }
}

class ExpandedRESTv2 extends RESTv2 {
  async login (body) {
    return makeRequestToBFX(() => this
      ._makePublicPostRequest('/login', body))
  }

  async verify (body) {
    return makeRequestToBFX(() => this
      ._makePublicPostRequest('/login/verify', body))
  }
}

decorateInjectable(HTTPRequest, depsTypes)

module.exports = HTTPRequest
