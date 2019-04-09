'use strict'

const { pick, omit, orderBy } = require('lodash')

const _getDataKeys = (data) => {
  return Object.keys(data)
    .filter(key => (
      Array.isArray(data[key]) &&
      data[key].length > 0
    ))
}

const _getMaxLength = (data) => {
  const dataArr = Object.values(data)

  if (dataArr.length === 0) {
    return 0
  }

  return Math.max(
    ...dataArr.map(item => item.length)
  )
}

const _mergeData = (data) => {
  if (
    !data ||
    typeof data !== 'object'
  ) {
    return []
  }

  const dataKeys = _getDataKeys(data)
  const _data = pick(data, dataKeys)
  const maxLength = _getMaxLength(_data)
  const res = []

  for (let i = 0; maxLength > i; i += 1) {
    dataKeys.forEach(key => {
      const { mts, vals } = { ..._data[key][i] }

      if (
        !Number.isInteger(mts) ||
        !vals ||
        typeof vals !== 'object' ||
        Object.keys(vals).length === 0
      ) {
        return
      }
      if (
        res.length === 0 ||
        res.every(item => mts !== item.mts)
      ) {
        res.push({
          mts,
          [key]: { ...vals }
        })

        return
      }

      res.forEach((item, index) => {
        if (mts === item.mts) {
          res[index] = {
            ...item,
            [key]: { ...vals }
          }
        }
      })
    })
  }

  return orderBy(res, ['mts'], ['desc'])
}

const _calcDataItem = (item = []) => {
  const _item = Object.values(omit(item, ['mts']))

  return _item.reduce((accum, curr) => {
    Object.entries(curr).forEach(([symb, val]) => {
      if (!Number.isFinite(val)) {
        return
      }
      if (Number.isFinite(accum[symb])) {
        accum[symb] += val

        return
      }

      accum[symb] = val
    })

    return accum
  }, {})
}

const _getReducer = (
  isSubCalc,
  isReverse,
  calcDataItem
) => {
  return (accum, item, i, arr) => {
    const res = calcDataItem(item, i, arr, accum)
    const data = {
      mts: item.mts,
      ...(isSubCalc ? { vals: { ...res } } : res)
    }

    if (isReverse) {
      accum.unshift(data)

      return accum
    }

    accum.push(data)

    return accum
  }
}

module.exports = (
  data,
  isSubCalc,
  calcDataItem = _calcDataItem,
  isReverse
) => {
  const _data = _mergeData(data)
  const reducer = _getReducer(
    isSubCalc,
    isReverse,
    calcDataItem
  )

  if (isReverse) {
    return _data.reduceRight(reducer, [])
  }

  return _data.reduce(reducer, [])
}
