'use strict'

const path = require('path')
const {
  startWorkers: _startWorkers
} = require('bfx-report/test/helpers/helpers.worker')

const _serviceRoot = path.join(__dirname, '../..')

const startWorkers = (
  logs,
  isForkWrk,
  countWrk = 1,
  conf = {},
  serviceRoot = _serviceRoot,
  isNotStartedEnv
) => {
  const _conf = {
    wtype: 'wrk-report-framework-api',
    wsPort: 23381,
    syncMode: true,
    isSchedulerEnabled: true,
    schedulerRule: '0 */5 * * *',
    ...conf
  }

  return _startWorkers(
    logs,
    isForkWrk,
    countWrk,
    _conf,
    serviceRoot,
    isNotStartedEnv,
    (serviceWrksAmount) => serviceWrksAmount * 2
  )
}

module.exports = {
  startWorkers
}
