'use strict'

const TYPES = require('../types')

module.exports = (ctx) => {
  return (syncColls) => {
    const dataInserter = ctx.container.get(
      TYPES.DataInserter
    )
    dataInserter.init(syncColls)

    return dataInserter
  }
}
