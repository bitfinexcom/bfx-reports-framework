'use strict'

const TYPES = require('../types')

module.exports = (ctx) => {
  return (...args) => {
    const syncUserStepData = ctx.container.get(
      TYPES.SyncUserStepData
    )

    const paramsOrder = [
      'symbol',
      'timeframe',
      'baseStart',
      'baseEnd',
      'currStart',
      'currEnd',
      'isBaseStepReady',
      'isCurrStepReady'
    ]
    const params = (
      args[0] &&
      typeof args[0] === 'object'
    )
      ? args
      : paramsOrder.reduce((accum, curr, i) => {
        accum[curr] = args[i]

        return accum
      }, {})

    syncUserStepData.setParams(params)

    return syncUserStepData
  }
}
