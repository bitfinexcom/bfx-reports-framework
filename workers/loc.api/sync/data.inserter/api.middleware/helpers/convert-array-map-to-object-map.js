'use strict'

module.exports = (apiRes) => {
  return apiRes.reduce((accum, item) => {
    if (
      !Array.isArray(item) ||
      item.length < 2
    ) {
      return accum
    }

    const [key, value] = item
    accum.push({ key, value })

    return accum
  }, [])
}
