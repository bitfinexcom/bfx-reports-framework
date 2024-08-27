'use strict'

/*
 * Proxy this error tester for import in the electron env
 */
const {
  isENetError
} = require('bfx-report/workers/loc.api/helpers/api-errors-testers')

module.exports = {
  isENetError
}
