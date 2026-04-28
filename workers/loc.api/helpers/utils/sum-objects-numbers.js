'use strict'

module.exports = (propName, objects = []) => {
  return objects.reduce((accum, curr) => {
    return Number.isFinite(curr?.[propName])
      ? accum + curr[propName]
      : accum
  }, 0)
}
