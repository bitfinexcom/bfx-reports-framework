'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../di/types')

class WSEventEmitter {
  constructor (wsTransport) {
    this.wsTransport = wsTransport
  }

  isInvalidAuth (args = {}, { apiKey, apiSecret } = {}) {
    const { auth = {} } = { ...args }

    return (
      auth.apiKey !== apiKey ||
      auth.apiSecret !== apiSecret
    )
  }

  emitProgress (
    handler = () => {}
  ) {
    return this.wsTransport.sendToActiveUsers(
      handler,
      'emitProgress'
    )
  }

  async emitRedirectingRequestsStatusToApi (
    handler = () => {}
  ) {
    return this.wsTransport.sendToActiveUsers(
      handler,
      'emitRedirectingRequestsStatusToApi'
    )
  }
}

decorate(injectable(), WSEventEmitter)
decorate(inject(TYPES.WSTransport), WSEventEmitter, 0)

module.exports = WSEventEmitter
