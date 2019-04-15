'use strict'

const {
  getMethodLimit: getMethodLimitBase
} = require('bfx-report/workers/loc.api/helpers')

const getMethodLimit = (sendLimit, method) => {
  const _methodsLimits = {
    candles: { default: 500, max: 500 }
  }

  return getMethodLimitBase(sendLimit, method, _methodsLimits)
}

module.exports = {
  getMethodLimit
}
