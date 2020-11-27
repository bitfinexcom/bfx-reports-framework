'use strict'

const { promisify } = require('util')
const setImmediatePromise = promisify(setImmediate)
const {
  prepareResponse
} = require('bfx-report/workers/loc.api/helpers')

const { isContainedSameMts } = require('../utils')

module.exports = async (
  res,
  args,
  methodColl,
  opts
) => {
  const {
    schema,
    additionalModel,
    isPrepareResponse,
    isNotConsideredSameMts,
    isPublic,
    isExcludePrivate,
    isNotDataConverted,
    method,
    findInCollByFn
  } = { ...opts }
  const {
    maxLimit,
    dateFieldName,
    symbolFieldName,
    name
  } = methodColl
  const { params } = { ...args }
  const {
    limit,
    symbol,
    notThrowError,
    notCheckNextPage
  } = { ...params }

  if (!isPrepareResponse) {
    return res
  }

  const _isContainedSameMts = isContainedSameMts(
    res,
    dateFieldName,
    limit
  )

  if (
    isNotConsideredSameMts ||
    !_isContainedSameMts
  ) {
    const symbols = (
      Array.isArray(symbol) &&
      symbol.length > 1
    )
      ? symbol
      : []

    return prepareResponse(
      res,
      dateFieldName,
      limit,
      notThrowError,
      notCheckNextPage,
      symbols,
      symbolFieldName,
      name
    )
  }

  const _args = {
    ...args,
    params: {
      ...params,
      limit: maxLimit
    }
  }

  await setImmediatePromise()

  return findInCollByFn(
    method,
    _args,
    {
      isPrepareResponse,
      isPublic,
      additionalModel,
      schema,
      isExcludePrivate,
      isNotDataConverted,
      isNotConsideredSameMts: true
    }
  )
}
