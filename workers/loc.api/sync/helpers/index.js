'use strict'

const getStartMtsByTimeframe = require('./get-start-mts-by-timeframe')
const getMtsGroupedByTimeframe = require('./get-mts-grouped-by-timeframe')
const calcGroupedData = require('./calc-grouped-data')
const groupByTimeframe = require('./group-by-timeframe')
const isForexSymb = require('./is-forex-symb')
const redirectRequestsToApi = require('./redirect-requests-to-api')
const checkCollPermission = require('./check-coll-permission')
const setMtsToStartingAndEndingFrames = require(
  './set-mts-to-starting-and-ending-frames'
)
const getBackIterable = require('./get-back-iterable')
const {
  delay
} = require('./utils')

module.exports = {
  getStartMtsByTimeframe,
  getMtsGroupedByTimeframe,
  calcGroupedData,
  groupByTimeframe,
  isForexSymb,
  redirectRequestsToApi,
  checkCollPermission,
  delay,
  setMtsToStartingAndEndingFrames,
  getBackIterable
}
