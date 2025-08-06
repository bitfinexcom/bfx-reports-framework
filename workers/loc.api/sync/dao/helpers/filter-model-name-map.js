'use strict'

const {
  FILTER_API_METHOD_NAMES
} = require('bfx-report/workers/loc.api/helpers')

module.exports = Object.values(FILTER_API_METHOD_NAMES)
  .reduce((map, name) => {
    const baseName = `${name[0].toUpperCase()}${name.slice(1)}`
    const key = `_get${baseName}`

    map.set(key, name)

    return map
  }, new Map())
