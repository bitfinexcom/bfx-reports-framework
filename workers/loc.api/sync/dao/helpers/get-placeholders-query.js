'use strict'

const { serializeVal } = require('./serialization')

module.exports = (obj, keys) => {
  const _keys = Array.isArray(keys)
    ? keys
    : Object.keys(obj)
  const placeholderVal = {}
  const placeholderArr = _keys.map((item, i) => {
    const key = `$${item}`

    placeholderVal[key] = serializeVal(obj[item])

    return `${key}`
  })
  const placeholders = placeholderArr.join(', ')

  return { placeholders, placeholderVal }
}
