'use strict'

const checkParams = require('./check-params')
const {
  checkParamsAuth,
  tryParseJSON,
  collObjToArr
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
  isEnotfoundError,
  isEaiAgainError,
  isSubAccountApiKeys,
  getAuthFromSubAccountAuth,
  getSubAccountAuthFromAuth
}
