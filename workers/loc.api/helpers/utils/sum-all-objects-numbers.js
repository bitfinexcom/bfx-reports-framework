'use stricts'

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
      const prevVal = Number.isFinite(accum?.[key])
        ? accum[key]
        : 0
      const currVal = Number.isFinite(val)
        ? val
        : 0

      accum[key] = prevVal + currVal

      return accum
    }, accum)
  }, {})
}
