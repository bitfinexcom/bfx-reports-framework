'use strict'

const checkParams = require('./check-params')
const {
  checkParamsAuth,
  tryParseJSON,
  collObjToArr,
  getDateString,
  isNotSyncRequired,
  sumObjectsNumbers,
  sumAllObjectsNumbers,
  sumArrayVolumes
} = require('./utils')
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
  isSubAccountApiKeys,
  getAuthFromSubAccountAuth,
  getSubAccountAuthFromAuth,
  sumObjectsNumbers,
  sumAllObjectsNumbers,
  sumArrayVolumes
}
