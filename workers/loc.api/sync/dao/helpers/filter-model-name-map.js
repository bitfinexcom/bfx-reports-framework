'use strict'

const { upperFirst } = require('lodash')
const {
  FILTER_MODELS_NAMES
} = require('bfx-report/workers/loc.api/helpers')

module.exports = Object.values(FILTER_MODELS_NAMES)
  .reduce((map, name) => {
    const key = `_get${upperFirst(name)}`

    map.set(key, name)

    return map
  }, new Map())
