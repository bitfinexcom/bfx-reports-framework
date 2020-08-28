'use strict'

const EventEmitter = require('events')
const {
  decorate,
  injectable
} = require('inversify')

class SyncInterrupter extends EventEmitter {
  constructor () {
    super()

    this.INTERRUPT_SYNC_EVENT = 'INTERRUPT_SYNC_EVENT'
    this.SYNC_INTERRUPTED_EVENT = 'SYNC_INTERRUPTED_EVENT'
    this.SYNC_INTERRUPTED_WITH_ERR_EVENT = 'ERR_SYNC_INTERRUPTED_WITH_ERR_EVENT'
  }

  // TODO:
  async interruptSync () {
    this.emit(this.INTERRUPT_SYNC_EVENT)
  }

  emitSyncInterrupted (error, progress) {
    if (error) {
      this.emit(this.SYNC_INTERRUPTED_WITH_ERR_EVENT, error)

      return
    }

    this.emit(this.SYNC_INTERRUPTED_EVENT, progress)
  }

  onceInterruptSync (cb) {
    this.once(this.INTERRUPT_SYNC_EVENT, cb)
  }
}

decorate(injectable(), SyncInterrupter)

module.exports = SyncInterrupter
