'use strict'

module.exports = (val) => {
  if (typeof val === 'boolean') {
    return +val
  }
  if (
    val &&
    typeof val === 'object'
  ) {
    return JSON.stringify(val)
  }

  return val
}
