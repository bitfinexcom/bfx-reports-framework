'use strict'

const AbstractWSEventEmitter = require(
  'bfx-report/workers/loc.api/abstract.ws.event.emitter'
)

const { decorateInjectable } = require('../di/utils')

const depsTypes = (TYPES) => [
  TYPES.WSTransport
]
class WSEventEmitter extends AbstractWSEventEmitter {
  constructor (wsTransport) {
    super()

    this.wsTransport = wsTransport
  }

  /**
   * @override
   */
  emit (handler, action) {
    return this.wsTransport.sendToActiveUsers(
      handler,
      action
    )
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
    return this.emit(
      handler,
      'emitProgress'
    )
  }

  emitSyncingStep (
    handler = () => {}
  ) {
    return this.emit(
      handler,
      'emitSyncingStep'
    )
  }

  emitSyncingStepToOne (
    handler = () => {},
    auth = {}
  ) {
    return this.emitSyncingStep(async (user, ...args) => {
      if (
        !Number.isInteger(auth?._id) ||
        user?._id !== auth?._id
      ) {
        return { isNotEmitted: true }
      }

      return typeof handler === 'function'
        ? await handler(user, ...args)
        : handler
    })
  }

  emitBfxUnamePwdAuthRequiredToOne (
    handler = () => {},
    auth = {}
  ) {
    return this.emit(async (user, ...args) => {
      if (
        !Number.isInteger(auth?._id) ||
        user?._id !== auth?._id
      ) {
        return { isNotEmitted: true }
      }

      return typeof handler === 'function'
        ? await handler(user, ...args)
        : handler
    }, 'emitBfxUnamePwdAuthRequired')
  }

  async emitRedirectingRequestsStatusToApi (
    handler = () => {}
  ) {
    return this.emit(
      handler,
      'emitRedirectingRequestsStatusToApi'
    )
  }
}

decorateInjectable(WSEventEmitter, depsTypes)

module.exports = WSEventEmitter
