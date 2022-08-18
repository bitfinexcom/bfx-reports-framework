'use strict'

const TYPES = require('../types')

module.exports = (ctx) => {
  return (params) => {
    const dataInserter = ctx.container.get(
      TYPES.DataInserter
    )
    dataInserter.init(params)

    return dataInserter
  }
}
