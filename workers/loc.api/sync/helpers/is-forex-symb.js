'use strict'

const FOREX_SYMBS = require('./forex-symbs')

module.exports = (
  currSymb,
  symbs = FOREX_SYMBS
) => {
  return (
    Array.isArray(symbs) &&
    symbs.some(symb => symb === currSymb)
  )
}
