'use strict'

const AbstractWSEventEmitter = require(
  'bfx-report/workers/loc.api/abstract.ws.event.emitter'
)

const { decorateInjectable } = require('../di/utils')

const depsTypes = (TYPES) => [
  TYPES.WSTransport,
  TYPES.Logger
]
class WSEventEmitter extends AbstractWSEventEmitter {
  constructor (wsTransport, logger) {
    super()

    this.wsTransport = wsTransport
    this.logger = logger

    this._maintenanceTurnedOffInterval = null
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

  /**
   * @deprecated
   */
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

  async emitReportFileGenerationCompletedToOne (
    handler = () => {},
    auth = {}
  ) {
    await this.emitCsvGenerationCompletedToOne(handler, auth)

    return this.emit(async (user, ...args) => {
      if (this.isNotTargetUser(auth, user)) {
        return { isNotEmitted: true }
      }

      return typeof handler === 'function'
        ? await handler(user, ...args)
        : handler
    }, 'emitReportFileGenerationCompletedToOne')
  }

  emitReportFileGenerationFailedToOne (
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
    }, 'emitReportFileGenerationFailedToOne')
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

  emitTrxTaxReportGenerationInBackgroundToOne (
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
    }, 'emitTrxTaxReportGenerationInBackgroundToOne')
  }

  async emitRedirectingRequestsStatusToApi (
    handler = () => {}
  ) {
    return this.emit(
      handler,
      'emitRedirectingRequestsStatusToApi'
    )
  }

  /**
   * @override
   */
  async emitMaintenanceTurnedOn (handler) {
    await super.emitMaintenanceTurnedOn(handler)

    if (this._maintenanceTurnedOffInterval) {
      return
    }

    this._maintenanceTurnedOffInterval = setInterval(async () => {
      try {
        const isMaintenanceModeOff = await this.wsTransport
          .isBfxApiMaintenanceModeOff()

        if (!isMaintenanceModeOff) {
          return
        }

        await this.emitMaintenanceTurnedOff()
      } catch (err) {
        this.logger.error(
          `WS_EVENT_EMITTER:MAINTENANCE_MODE:INTERVAL: ${err.stack || err}`
        )
      }
    }, 10000)
  }

  /**
   * @override
   */
  async emitMaintenanceTurnedOff (handler) {
    await super.emitMaintenanceTurnedOff(handler)

    clearInterval(this._maintenanceTurnedOffInterval)
    this._maintenanceTurnedOffInterval = null
  }
}

decorateInjectable(WSEventEmitter, depsTypes)

module.exports = WSEventEmitter
