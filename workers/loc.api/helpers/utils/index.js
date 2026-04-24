'use strict'

const orderBy = require('./order-by')
const pushLargeArr = require('./push-large-arr')
const sumArrayVolumes = require('./sum-array-volumes')
const sumAllObjectsNumbers = require('./sum-all-objects-numbers')
const pickAllLowerObjectsNumbers = require('./pick-all-lower-objects-numbers')

module.exports = {
  pickAllLowerObjectsNumbers,
  sumAllObjectsNumbers,
  sumArrayVolumes,
  pushLargeArr,
  orderBy
}
