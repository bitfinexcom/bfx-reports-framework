'use strict'

const { pick, omit, orderBy } = require('lodash')

const getTrades = require('./get-trades')
const getMarginTrades = require('./get-margin-trades')
const getFundingPayment = require('./get-funding-payment')
const getMovementFees = require('./get-movement-fees')

const _getData = async (dao, args) => {
  const { skip } = { ...args.params }
  const map = {
    trades: getTrades,
    marginTrades: getMarginTrades,
    fundingPayment: getFundingPayment,
    movementFees: getMovementFees
  }
  const res = {}

  for (const [key, getter] of Object.entries(map)) {
    if (
      Array.isArray(skip) &&
      skip.some(item => item === key)
    ) {
      continue
    }

    res[key] = await getter(dao, args)
  }

  return res
}

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

const _calcData = (data) => {
  const _data = _mergeData(data)
  return _data.map(item => {
    const res = Object.values(omit(item, ['mts']))
      .reduce((accum, curr) => {
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

    return {
      mts: item.mts,
      ...res
    }
  })
}

module.exports = async (dao, args = {}) => {
  const data = await _getData(dao, args)
  const res = _calcData(data)

  return res
}
