'use strict'

const {
  checkParamsAuth,
  tryParseJSON,
  collObjToArr,
  getDateString,
  isNotSyncRequired,
  sumObjectsNumbers,
  pickLowerObjectsNumbers,
  sumAllObjectsNumbers,
  pickAllLowerObjectsNumbers,
  sumArrayVolumes,
  pushLargeArr
} = require('./utils')
const {
  isSubAccountApiKeys,
  getAuthFromSubAccountAuth,
  getSubAccountAuthFromAuth
} = require('./sub-account-auth')
const isBfxApiStaging = require('./is-bfx-api-staging')

module.exports = {
  checkParamsAuth,
  tryParseJSON,
  collObjToArr,
  getDateString,
  isNotSyncRequired,
  isSubAccountApiKeys,
  getAuthFromSubAccountAuth,
  getSubAccountAuthFromAuth,
  sumObjectsNumbers,
  pickLowerObjectsNumbers,
  sumAllObjectsNumbers,
  pickAllLowerObjectsNumbers,
  sumArrayVolumes,
  pushLargeArr,
  isBfxApiStaging
}
