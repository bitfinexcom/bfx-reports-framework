'use strict'

const TYPES = require('../types')

module.exports = (ctx) => {
  return (...args) => {
    const syncUserStepData = ctx.container.get(
      TYPES.SyncUserStepData
    )

    const params = (
      args[0] &&
      typeof args[0] === 'object'
    )
      ? [
          args[0]?.symbol,
          args[0]?.timeframe,
          args[0]?.baseStart,
          args[0]?.baseEnd,
          args[0]?.currStart,
          args[0]?.currEnd,
          args[0]?.isBaseStepReady,
          args[0]?.isCurrStepReady
        ]
      : args

    syncUserStepData.setParams(...params)

    return syncUserStepData
  }
}
