'use strict'

module.exports = (
  currSymb,
  symbs = ['EUR', 'JPY', 'GBP', 'USD']
) => {
  return (
    Array.isArray(symbs) &&
    symbs.some(symb => symb === currSymb)
  )
}
