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

    const { auth } = { ...args }
    const check = checker.bind(this.checkers)
    const isValid = await check(auth)

    if (!isValid) {
      const currProgress = await this.progress.getProgress()
      const isDBSyncing = currProgress < 100

      if (isDBSyncing) {
        throw new DataConsistencyWhileSyncingError()
      }

      throw new DataConsistencyError()
    }
  }
}

decorateInjectable(DataConsistencyChecker, depsTypes)

module.exports = DataConsistencyChecker
