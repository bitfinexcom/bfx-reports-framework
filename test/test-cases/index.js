'use strict'

const apiSyncModeSqliteTestCases = require(
  './api-sync-mode-sqlite-test-cases'
)
const additionalApiSyncModeSqliteTestCases = require(
  './additional-api-sync-mode-sqlite-test-cases'
)
const signUpTestCase = require('./sign-up-test-case')
const getSyncProgressTestCase = require('./get-sync-progress-test-case')
const removeUserTestCases = require('./remove-user-test-cases')

module.exports = {
  apiSyncModeSqliteTestCases,
  additionalApiSyncModeSqliteTestCases,
  signUpTestCase,
  getSyncProgressTestCase,
  removeUserTestCases
}
