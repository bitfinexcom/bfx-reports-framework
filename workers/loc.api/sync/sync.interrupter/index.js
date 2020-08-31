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

    this._isInterrupted = false
    this._interruptPromise = Promise.resolve()
  }

  hasInterrupted () {
    return this._isInterrupted
  }

  interruptSync () {
    if (this._isInterrupted) {
      return this._interruptPromise
    }

    this._isInterrupted = true
    this._interruptPromise = new Promise((resolve, reject) => {
      try {
        this.emit(this.INTERRUPT_SYNC_EVENT)

        const errorHandler = (err) => {
          this.off(this.SYNC_INTERRUPTED_EVENT, progressHandler)
          this._isInterrupted = false

          reject(err)
        }
        const progressHandler = (progress) => {
          this.off(this.SYNC_INTERRUPTED_WITH_ERR_EVENT, errorHandler)
          this._isInterrupted = false

          resolve(progress)
        }

        this.once(this.SYNC_INTERRUPTED_WITH_ERR_EVENT, errorHandler)
        this.once(this.SYNC_INTERRUPTED_EVENT, progressHandler)
      } catch (err) {
        this._isInterrupted = false

        reject(err)
      }
    })

    return this._interruptPromise
  }

  onceInterruptSync (cb) {
    this.once(this.INTERRUPT_SYNC_EVENT, cb)
  }

  emitSyncInterrupted (error, progress) {
    if (error) {
      this.emit(this.SYNC_INTERRUPTED_WITH_ERR_EVENT, error)

      return
    }

    this.emit(this.SYNC_INTERRUPTED_EVENT, progress)
  }
}

decorate(injectable(), SyncInterrupter)

module.exports = SyncInterrupter
