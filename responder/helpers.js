'use strict'

const getMethodLimit = (getMethodLimitFn, sendLimit, method) => {
  const _methodsLimits = {
    candles: { default: 500, max: 500 }
  }

  return getMethodLimitFn(sendLimit, method, _methodsLimits)
}

module.exports = {
  getMethodLimit
}
