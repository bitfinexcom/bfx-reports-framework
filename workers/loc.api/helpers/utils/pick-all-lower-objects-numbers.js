'use strict'

module.exports = (propName, objects = []) => {
  return objects.reduce((accum, curr) => {
    if (
      !curr?.[propName] ||
      typeof curr?.[propName] !== 'object'
    ) {
      return accum
    }

    const entries = Object.entries(curr[propName])

    return entries.reduce((accum, [key, val]) => {
      if (!Number.isFinite(val)) {
        return accum
      }
      if (!Number.isFinite(accum?.[key])) {
        accum[key] = val

        return accum
      }

      accum[key] = val < accum[key]
        ? val
        : accum[key]

      return accum
    }, accum)
  }, {})
}
