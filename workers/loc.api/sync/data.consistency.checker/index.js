'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const {
  DataConsistencyCheckerFindingError
} = require('../../errors')

const TYPES = require('../../di/types')

class DataConsistencyChecker {
  constructor (
    checkers
  ) {
    this.checkers = checkers
  }

  // TODO:
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
      throw new Error('ERR_') // TODO:
    }
  }
}

decorate(injectable(), DataConsistencyChecker)
decorate(inject(TYPES.Checkers), DataConsistencyChecker, 0)

module.exports = DataConsistencyChecker
