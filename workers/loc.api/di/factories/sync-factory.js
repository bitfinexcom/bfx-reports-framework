'use strict'

const TYPES = require('../types')

module.exports = (ctx) => {
  return () => {
    const sync = ctx.container.get(
      TYPES.Sync
    )

    return sync
  }
}
