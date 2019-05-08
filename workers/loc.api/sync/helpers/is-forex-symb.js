'use strict'

module.exports = (symbs = [], currSymb) => {
  return (
    Array.isArray(symbs) &&
    symbs.some(symb => symb === currSymb)
  )
}
