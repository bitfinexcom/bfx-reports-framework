'use strict'

const addPropsToResIfExist = require(
  './add-props-to-res-if-exist'
)
const getFlagsFromLedgerDescription = require(
  './get-flags-from-ledger-description'
)
const getCategoryFromDescription = require(
  './get-category-from-description'
)
const convertArrayMapToObjectMap = require(
  './convert-array-map-to-object-map'
)

module.exports = {
  addPropsToResIfExist,
  getFlagsFromLedgerDescription,
  getCategoryFromDescription,
  convertArrayMapToObjectMap
}
