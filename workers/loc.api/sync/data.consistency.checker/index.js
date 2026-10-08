'use strict'

const {
  DataConsistencyCheckerFindingError,
  DataConsistencyError,
  DataConsistencyWhileSyncingError
} = require('../../errors')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.Checkers,
  TYPES.Progress
]
class DataConsistencyChecker {
  constructor (
    checkers,
    progress
  ) {
    this.checkers = checkers
    this.progress = progress
  }

  async check (checkerName, args) {
    const { auth, interrupter } = args ?? {}

    if (interrupter?.hasInterrupted?.()) {
      return
    }
    if (
      !checkerName ||
      typeof checkerName !== 'string'
    ) {
      throw new DataConsistencyCheckerFindingError()
    }

    const checker = this.checkers[checkerName]

    if (typeof checker !== 'function') {
      throw new DataConsistencyCheckerFindingError()
    }

    const check = checker.bind(this.checkers)
    const isValid = await check(auth, { interrupter })

    if (
      interrupter?.hasInterrupted?.() ||
      isValid
    ) {
      return
    }

    const {
      isSyncInProgress
    } = await this.progress.getProgress()

    if (interrupter?.hasInterrupted?.()) {
      return
    }
    if (isSyncInProgress) {
      throw new DataConsistencyWhileSyncingError()
    }

    throw new DataConsistencyError()
  }
}

decorateInjectable(DataConsistencyChecker, depsTypes)

module.exports = DataConsistencyChecker
