'use strict'

const { pick, omit } = require('lodash')

const getBackIterable = require('../helpers/get-back-iterable')

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
  const iterator = getBackIterable(res)

  for (let i = 0; maxLength > i; i += 1) {
    dataKeys.forEach(key => {
      const { mts, vals } = { ..._data[key][i] }
      const firstItem = res[0]
      const lastItem = res[res.length - 1]

      if (
        !Number.isInteger(mts) ||
        !vals ||
        typeof vals !== 'object' ||
        Object.keys(vals).length === 0
      ) {
        return
      }
      if (
        res.length !== 0 &&
        firstItem.mts < mts
      ) {
        res.unshift({
          mts,
          [key]: { ...vals }
        })

        return
      }
      if (
        res.length === 0 ||
        lastItem.mts > mts
      ) {
        res.push({
          mts,
          [key]: { ...vals }
        })

        return
      }

      for (const [index, item] of iterator.entries()) {
        if (mts === item.mts) {
          res[index] = {
            ...item,
            [key]: { ...vals }
          }

          return
        }
        if (
          res[index + 1] &&
          res[index + 1].mts < mts &&
          res[index].mts > mts
        ) {
          res.splice(index + 1, 0, {
            mts,
            [key]: { ...vals }
          })

          return
        }
      }
    })
  }

  return res
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
  return async (asyncAccum, item, i, arr) => {
    const accum = await asyncAccum
    const res = await calcDataItem(item, i, arr, accum)

    if (
      !res ||
      typeof res !== 'object' ||
      Object.keys(res).length === 0
    ) {
      return accum
    }

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
  const initVal = Promise.resolve([])

  if (isReverse) {
    return _data.reduceRight(reducer, initVal)
  }

  return _data.reduce(reducer, initVal)
}
