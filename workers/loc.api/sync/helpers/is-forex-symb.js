'use strict'

const FOREX_SYMBS = require(
  'bfx-report/workers/loc.api/helpers/forex.symbs'
)

module.exports = (
  currSymb,
  symbs = FOREX_SYMBS
) => {
  return (
    Array.isArray(symbs) &&
    symbs.some(symb => symb === currSymb)
  )
}
