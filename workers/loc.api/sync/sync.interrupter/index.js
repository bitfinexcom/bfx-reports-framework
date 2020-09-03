'use strict'

const {
  decorate,
  injectable
} = require('inversify')

const Interrupter = require(
  'bfx-report/workers/loc.api/interrupter'
)

class SyncInterrupter extends Interrupter {
  constructor () {
    super()

    this.INTERRUPT_SYNC_EVENT = 'INTERRUPT_SYNC_EVENT'
    this.SYNC_INTERRUPTED_EVENT = 'SYNC_INTERRUPTED_EVENT'
    this.SYNC_INTERRUPTED_WITH_ERR_EVENT = 'ERR_SYNC_INTERRUPTED_WITH_ERR_EVENT'

    this.INITIAL_PROGRESS = 'SYNCHRONIZATION_HAS_HOT_BEEN_STARTED_TO_INTERRUPT'
    this.INTERRUPTED_PROGRESS = 'SYNCHRONIZATION_HAS_BEEN_INTERRUPTED'
  }

  _init () {
    this.on(
      this.INTERRUPT_EVENT,
      () => this.emit(this.INTERRUPT_SYNC_EVENT)
    )
    this.on(
      this.SYNC_INTERRUPTED_EVENT,
      () => this.emit(this.INTERRUPTED_EVENT)
    )
    this.on(
      this.SYNC_INTERRUPTED_WITH_ERR_EVENT,
      () => this.emit(this.INTERRUPTED_WITH_ERR_EVENT)
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

decorate(injectable(), SyncInterrupter)

module.exports = SyncInterrupter
