'use strict'

const addPropsToResIfExist = require(
  './add-props-to-res-if-exist'
)
const getFlagsFromStringProp = require(
  './get-flags-from-string-prop'
)
const getCategoryFromDescription = require(
  './get-category-from-description'
)
const convertArrayMapToObjectMap = require(
  './convert-array-map-to-object-map'
)

module.exports = {
  addPropsToResIfExist,
  getFlagsFromStringProp,
  getCategoryFromDescription,
  convertArrayMapToObjectMap
}
