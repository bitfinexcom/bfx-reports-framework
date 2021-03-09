'use strict'

const EventEmitter = require('events')
const { isEmpty } = require('lodash')

const {
  tryParseJSON
} = require('../../helpers')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.TABLES_NAMES,
  TYPES.WSEventEmitter,
  TYPES.Logger
]
class Progress extends EventEmitter {
  constructor (
    dao,
    TABLES_NAMES,
    wsEventEmitter,
    logger
  ) {
    super()

    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.wsEventEmitter = wsEventEmitter
    this.logger = logger
  }

  async setProgress (progress) {
    const isError = (
      progress instanceof Error ||
      (typeof progress === 'string' && /error/gi.test(progress))
    )
    const _progress = isError
      ? progress.toString()
      : progress

    try {
      await this.dao.updateRecordOf(
        this.TABLES_NAMES.PROGRESS,
        { value: JSON.stringify(_progress) }
      )
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
      .getElemInCollBy(this.TABLES_NAMES.PROGRESS)

    return (
      !isEmpty(progress) &&
      typeof progress.value === 'string'
    )
      ? tryParseJSON(progress.value, true)
      : 'SYNCHRONIZATION_HAS_NOT_STARTED_YET'
  }
}

decorateInjectable(Progress, depsTypes)

module.exports = Progress
