'use strict'

module.exports = (propName, objects = []) => {
  return objects.reduce((accum, curr) => {
    if (!Number.isFinite(curr?.[propName])) {
      return accum
    }
    if (!Number.isFinite(accum)) {
      return curr[propName]
    }

    return curr[propName] < accum
      ? curr[propName]
      : accum
  }, null)
}
