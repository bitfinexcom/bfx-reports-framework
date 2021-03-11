'use strict'

const {
  DataConsistencyCheckerFindingError,
  DataConsistencyError
} = require('../../errors')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.Checkers
]
class DataConsistencyChecker {
  constructor (
    checkers
  ) {
    this.checkers = checkers
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
      throw new DataConsistencyError()
    }
  }
}

decorateInjectable(DataConsistencyChecker, depsTypes)

module.exports = DataConsistencyChecker
