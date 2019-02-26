'use strict'

const ALLOWED_COLLS = require('bfx-report/workers/loc.api/sync/allowed.colls')

module.exports = {
  ...ALLOWED_COLLS,
  CANDLES: 'candles'
}
