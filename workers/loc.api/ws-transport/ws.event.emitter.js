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

  isNotTargetUser (auth = {}, user = {}) {
    // For the sync process user id need to take from the session object
    const _id = auth?._id ?? auth?.session?._id

    return (
      !Number.isInteger(_id) ||
      user?._id !== _id
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
      if (this.isNotTargetUser(auth, user)) {
        return { isNotEmitted: true }
      }

      return typeof handler === 'function'
        ? await handler(user, ...args)
        : handler
    })
  }

  emitCsvGenerationCompletedToOne (
    handler = () => {},
    auth = {}
  ) {
    return this.emit(async (user, ...args) => {
      if (this.isNotTargetUser(auth, user)) {
        return { isNotEmitted: true }
      }

      return typeof handler === 'function'
        ? await handler(user, ...args)
        : handler
    }, 'emitCsvGenerationCompletedToOne')
  }

  emitBfxUnamePwdAuthRequiredToOne (
    handler = () => {},
    auth = {}
  ) {
    return this.emit(async (user, ...args) => {
      if (this.isNotTargetUser(auth, user)) {
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
