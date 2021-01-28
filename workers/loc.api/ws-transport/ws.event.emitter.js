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

  emitSyncingStep (
    handler = () => {}
  ) {
    return this.wsTransport.sendToActiveUsers(
      handler,
      'emitSyncingStep'
    )
  }

  emitSyncingStepToOne (
    handler = () => {},
    auth = {}
  ) {
    return this.emitSyncingStep((user, ...args) => {
      if (
        !auth ||
        typeof auth !== 'object' ||
        user._id !== auth._id
      ) {
        return
      }

      return handler(user, ...args)
    })
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
