'use strict'

const getSymbolFilter = require('./get-symbol-filter')
const getTimeframeFilter = require('./get-timeframe-filter')

const _isInsertableArrayObjects = (type = '') => {
  return /^((hidden:)|(public:)|())insertable:array:objects$/i
    .test(type)
}

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
      typeof field === 'boolean' &&
      Object.keys(model)
        .some(key => key === modelFieldName)
    ) {
      return {
        ...accum,
        [modelFieldName]: Number(field)
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
  if (!_isInsertableArrayObjects(type)) {
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
    ['isMarginFundingPayment', 'isAffiliateRebate'],
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
