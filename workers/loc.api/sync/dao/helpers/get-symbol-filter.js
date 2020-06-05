'use strict'

module.exports = (symbol, symbolFieldName) => {
  if (typeof symbol === 'string') {
    return { [symbolFieldName]: symbol }
  }
  if (Array.isArray(symbol)) {
    return {
      [symbolFieldName]: symbol.length === 1
        ? symbol[0]
        : symbol
    }
  }

  return {}
}
