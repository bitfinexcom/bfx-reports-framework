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

  isInvalidAuth (auth = {}, { _id, email } = {}) {
    return (
      auth._id !== _id ||
      auth.email !== email
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
