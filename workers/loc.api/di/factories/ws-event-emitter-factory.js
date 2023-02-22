'use strict'

const TYPES = require('../types')

module.exports = (ctx) => {
  return () => {
    const wsEventEmitter = ctx.container.get(
      TYPES.WSEventEmitter
    )

    return wsEventEmitter
  }
}
