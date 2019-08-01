'use strict'

const EventEmitter = require('events')
const { isEmpty } = require('lodash')
const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')
const {
  tryParseJSON
} = require('../../helpers')

class Progress extends EventEmitter {
  constructor (
    dao,
    wsEventEmitter,
    logger
  ) {
    super()

    this.dao = dao
    this.wsEventEmitter = wsEventEmitter
    this.logger = logger
  }

  async setProgress (progress) {
    const isError = progress instanceof Error
    const _progress = isError
      ? progress.toString()
      : progress

    try {
      await this.dao.updateProgress(_progress)
      this.emit(_progress)
      await this.wsEventEmitter.emitProgress(() => _progress)
    } catch (e) {
      this.logger.error(
        `PROGRESS:SYNC:SET: ${e.stack || e}`
      )
    }

    if (isError) {
      this.logger.error(
        `PROGRESS:SYNC: ${progress.stack || progress}`
      )
    }
  }

  async getProgress () {
    const progress = await this.dao
      .getFirstElemInCollBy('progress')

    return (
      !isEmpty(progress) &&
      typeof progress.value === 'string'
    )
      ? tryParseJSON(progress.value, true)
      : 'SYNCHRONIZATION_HAS_NOT_STARTED_YET'
  }
}

decorate(injectable(), Progress)
decorate(inject(TYPES.DAO), Progress, 0)
decorate(inject(TYPES.WSEventEmitter), Progress, 1)
decorate(inject(TYPES.Logger), Progress, 2)

module.exports = Progress
