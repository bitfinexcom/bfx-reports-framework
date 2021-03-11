'use strict'

const Interrupter = require(
  'bfx-report/workers/loc.api/interrupter'
)

const { decorateInjectable } = require('../../di/utils')

class SyncInterrupter extends Interrupter {
  constructor () {
    super()
    this.setMaxListeners(50)

    this.INTERRUPT_SYNC_EVENT = 'INTERRUPT_SYNC_EVENT'
    this.SYNC_INTERRUPTED_EVENT = 'SYNC_INTERRUPTED_EVENT'
    this.SYNC_INTERRUPTED_WITH_ERR_EVENT = 'ERR_SYNC_INTERRUPTED_WITH_ERR_EVENT'

    this.INITIAL_PROGRESS = 'SYNCHRONIZATION_HAS_NOT_BEEN_STARTED_TO_INTERRUPT'
    this.INTERRUPTED_PROGRESS = 'SYNCHRONIZATION_HAS_BEEN_INTERRUPTED'

    this._init()
  }

  _init () {
    this._pipe(
      this.INTERRUPT_EVENT,
      this.INTERRUPT_SYNC_EVENT
    )
    this._pipe(
      this.SYNC_INTERRUPTED_EVENT,
      this.INTERRUPTED_EVENT
    )
    this._pipe(
      this.SYNC_INTERRUPTED_WITH_ERR_EVENT,
      this.INTERRUPTED_WITH_ERR_EVENT
    )
  }

  _pipe (event, pipedEvent) {
    this.on(
      event,
      (...args) => this.emit(pipedEvent, ...args)
    )
  }

  onceInterrupt (cb) {
    this.once(this.INTERRUPT_SYNC_EVENT, cb)
  }

  offInterrupt (cb) {
    this.off(this.INTERRUPT_SYNC_EVENT, cb)
  }

  emitInterrupted (error, progress) {
    if (error) {
      this.emit(this.SYNC_INTERRUPTED_WITH_ERR_EVENT, error)

      return
    }

    this.emit(this.SYNC_INTERRUPTED_EVENT, progress)
  }
}

decorateInjectable(SyncInterrupter)

module.exports = SyncInterrupter
