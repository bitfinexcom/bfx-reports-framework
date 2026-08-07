'use strict'

const TYPES = require('../types')

module.exports = (ctx) => {
  return () => {
    const sync = ctx.get(
      TYPES.Sync
    )

    return sync
  }
}
