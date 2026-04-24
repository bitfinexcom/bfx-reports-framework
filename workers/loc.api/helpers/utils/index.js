'use strict'

const isNotSyncRequired = require('./is-not-sync-required')
const pickLowerObjectsNumbers = require('./pick-lower-objects-numbers')
const pickAllLowerObjectsNumbers = require('./pick-all-lower-objects-numbers')
const sumObjectsNumbers = require('./sum-objects-numbers')
const sumAllObjectsNumbers = require('./sum-all-objects-numbers')
const sumArrayVolumes = require('./sum-array-volumes')
const pushLargeArr = require('./push-large-arr')
const orderBy = require('./order-by')

module.exports = {
  isNotSyncRequired,
  pickLowerObjectsNumbers,
  pickAllLowerObjectsNumbers,
  sumObjectsNumbers,
  sumAllObjectsNumbers,
  sumArrayVolumes,
  pushLargeArr,
  orderBy
}
