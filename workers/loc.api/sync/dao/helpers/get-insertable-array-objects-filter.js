'use strict'

const getSymbolFilter = require('./get-symbol-filter')

const _isInsertableArrayObjects = (type = '') => {
  return /^((hidden:)|(public:)|())insertable:array:objects$/i
    .test(type)
}

module.exports = (
  {
    type,
    dateFieldName,
    model,
    symbolFieldName,
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
    isMarginFundingPayment,
    filter: reqFilter = {}
  } = { ...params }
  const symbFilter = getSymbolFilter(symbol, symbolFieldName)
  const filter = {
    ...reqFilter,
    _dateFieldName: dateFieldName,
    start,
    end,
    ...additionalFilteringProps,
    ...symbFilter
  }

  if (
    typeof isMarginFundingPayment === 'boolean' &&
    Object.keys(model)
      .some(key => key === '_isMarginFundingPayment')
  ) {
    filter._isMarginFundingPayment = Number(isMarginFundingPayment)
  }

  return filter
}
