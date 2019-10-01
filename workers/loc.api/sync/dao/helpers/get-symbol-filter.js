'use strict'

module.exports = (symbol, symbolFieldName) => {
  if (typeof symbol === 'string') {
    return { [symbolFieldName]: symbol }
  }
  if (
    Array.isArray(symbol) &&
    symbol.length === 1
  ) {
    return { [symbolFieldName]: symbol[0] }
  }

  return {}
}
