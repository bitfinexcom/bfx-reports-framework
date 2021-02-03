'use strict'

const checkParams = require('./check-params')
const {
  checkParamsAuth,
  tryParseJSON,
  collObjToArr,
  getDateString,
  isNotSyncRequired
} = require('./utils')
const {
  isEnotfoundError,
  isEaiAgainError
} = require('./api-errors-testers')
const {
  isSubAccountApiKeys,
  getAuthFromSubAccountAuth,
  getSubAccountAuthFromAuth
} = require('./sub-account-auth')

module.exports = {
  checkParams,
  checkParamsAuth,
  tryParseJSON,
  collObjToArr,
  getDateString,
  isNotSyncRequired,
  isEnotfoundError,
  isEaiAgainError,
  isSubAccountApiKeys,
  getAuthFromSubAccountAuth,
  getSubAccountAuthFromAuth
}
