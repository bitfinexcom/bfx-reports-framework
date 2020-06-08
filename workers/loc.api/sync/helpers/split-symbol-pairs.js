'use strict'

module.exports = (symbol) => {
  const str = (
    symbol[0] === 't' ||
    symbol[0] === 'f'
  )
    ? symbol.slice(1)
    : symbol

  if (
    str.length > 5 &&
    /.+[:].+/.test(str)
  ) {
    return str.split(':')
  }
  if (str.length < 6) {
    return [str]
  }

  return [str.slice(0, -3), str.slice(-3)]
}
