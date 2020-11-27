'use strict'

const serializeVal = require('./serialize-val')

module.exports = (obj, keys) => {
  const _keys = Array.isArray(keys)
    ? keys
    : Object.keys(obj)

  return _keys.reduce((accum, key) => ({
    ...accum,
    [key]: serializeVal(obj[key])
  }), {})
}
