'use strict'

module.exports = (propName, objects = []) => {
  return objects.reduce((accum, curr) => {
    if (!Array.isArray(curr?.[propName])) {
      return accum
    }

    for (const obj of curr[propName]) {
      if (typeof obj?.curr !== 'string') {
        continue
      }

      const entries = Object.entries(obj)
        .filter(([key]) => key !== 'curr')

      if (entries.length === 0) {
        continue
      }

      if (accum.length === 0) {
        accum.push({ ...obj })

        continue
      }

      const accumObjIndex = accum
        .findIndex((item) => item?.curr === obj.curr)

      if (accumObjIndex === -1) {
        accum.push({ ...obj })

        continue
      }

      const resObj = entries.reduce((accum, [key, vol]) => {
        const accumVol = Number.isFinite(accum?.[key])
          ? accum[key]
          : 0
        const currVol = Number.isFinite(vol)
          ? vol
          : 0

        accum[key] = accumVol + currVol

        return accum
      }, accum[accumObjIndex])

      // For right order in resulting array
      accum.splice(accumObjIndex, 1)
      accum.push(resObj)
    }

    return accum
  }, [])
}
