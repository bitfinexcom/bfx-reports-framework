'use strict'

const _getValue = (obj, path) => {
  if (typeof path !== 'string') {
    return obj?.[path]
  }

  return path.split('.').reduce((accum, key) => accum?.[key], obj)
}

module.exports = (collection, iteratees = [], orders = []) => {
  // It's able to consider iterable objects as well
  // If iterable object is required, just create it after ordering, not here
  const copiedColl = [...collection]

  return copiedColl.sort((a, b) => {
    for (const [i, iteratee] of iteratees.entries()) {
      const direction = orders[i] === 'desc' ? -1 : 1

      const valA = typeof iteratee === 'function'
        ? iteratee(a)
        : _getValue(a, iteratee)
      const valB = typeof iteratee === 'function'
        ? iteratee(b)
        : _getValue(b, iteratee)

      if (valA === valB) {
        continue
      }

      if (
        valA === undefined ||
        valA === null
      ) {
        return 1
      }
      if (
        valB === undefined ||
        valB === null
      ) {
        return -1
      }

      if (valA > valB) {
        return direction
      }
      if (valA < valB) {
        return -direction
      }
    }

    return 0
  })
}
