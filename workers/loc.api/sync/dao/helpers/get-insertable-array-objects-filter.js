'use strict'

const getSymbolFilter = require('./get-symbol-filter')
const getTimeframeFilter = require('./get-timeframe-filter')
const {
  isInsertableArrObjAnyProtection
} = require('../../schema/utils')

const getFieldsFilters = (
  fieldNames = [],
  params,
  model
) => {
  return fieldNames.reduce((accum, fieldName) => {
    const modelFieldName = `_${fieldName}`
    const _params = { ...params }
    const field = _params[fieldName]

    if (
      Object.keys(model)
        .some(key => key === modelFieldName)
    ) {
      if (typeof field === 'boolean') {
        return {
          ...accum,
          [modelFieldName]: Number(field)
        }
      }
      if (typeof field === 'number') {
        return {
          ...accum,
          [modelFieldName]: field
        }
      }
    }

    return accum
  }, {})
}

module.exports = (
  {
    type,
    dateFieldName,
    model,
    symbolFieldName,
    timeframeFieldName,
    additionalFilteringProps
  } = {},
  params = {}
) => {
  if (!isInsertableArrObjAnyProtection(type)) {
    return {}
  }

  const {
    start = 0,
    end = Date.now(),
    symbol,
    timeframe,
    filter: reqFilter = {}
  } = { ...params }
  const symbFilter = getSymbolFilter(symbol, symbolFieldName)
  const timeframeFilter = getTimeframeFilter(timeframe, timeframeFieldName)
  const fieldsFilters = getFieldsFilters(
    [
      'isMarginFundingPayment',
      'isAffiliateRebate',
      'isStakingPayments',
      'category'
    ],
    params,
    model
  )
  const filter = {
    ...reqFilter,
    _dateFieldName: dateFieldName,
    start,
    end,
    ...additionalFilteringProps,
    ...symbFilter,
    ...timeframeFilter,
    ...fieldsFilters
  }

  return filter
}
