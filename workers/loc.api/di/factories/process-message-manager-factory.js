'use strict'

const TYPES = require('../types')

module.exports = (ctx) => {
  const { dbDriver } = ctx.get(
    TYPES.CONF
  )

  return () => {
    const depTypes = [
      TYPES.DAO,
      TYPES.DBBackupManager,
      TYPES.RecalcSubAccountLedgersBalancesHook
    ]
    const deps = depTypes.map((type) => {
      return ctx.get(type)
    })

    if (dbDriver === 'better-sqlite') {
      const processMessageManager = ctx.get(
        TYPES.ProcessMessageManager
      )
      processMessageManager.setDeps(...deps)

      return processMessageManager
    }
  }
}
