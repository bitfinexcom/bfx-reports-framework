'use strict'

const {
  decorateInjectable
} = require('@bitfinex/bfx-report/workers/loc.api/di/utils')

const _TYPES = require('../types')

module.exports = (
  ModuleClass,
  getDepsTypesFn,
  TYPES = _TYPES
) => decorateInjectable(
  ModuleClass,
  getDepsTypesFn,
  TYPES
)
