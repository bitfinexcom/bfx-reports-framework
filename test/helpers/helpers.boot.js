'use strict'

const {
  startEnvironment: _startEnvironment
} = require('bfx-report/test/helpers/helpers.boot')

const {
  startWorkers: _startWorkers
} = require('./helpers.worker')

const startEnvironment = (
  logs = false,
  isForkWrk = false,
  countWrk = 1,
  conf = {},
  serviceRoot,
  isNotStartedEnv,
  startWorkers = _startWorkers
) => {
  return _startEnvironment(
    logs,
    isForkWrk,
    countWrk,
    conf,
    serviceRoot,
    isNotStartedEnv,
    startWorkers
  )
}

module.exports = {
  startEnvironment
}
