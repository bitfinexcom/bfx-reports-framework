'use strict'

const mockData = require('bfx-report/test/helpers/mock-data')

const _ms = Date.now()

module.exports = new Map([
  ...mockData,
  [
    'candles',
    [[
      _ms,
      3645.7,
      3648.5,
      3649,
      3645.7,
      9.40052609
    ]]
  ]
])
