'use strict'

const _isInsertableArrayObjects = (type = '') => {
  return /^((hidden:)|(public:)|())insertable:array:objects$/i
    .test(type)
}

const _getSymbFilter = ({ symbol } = {}) => {
  if (typeof symbol === 'string') {
    return symbol
  }
  if (
    Array.isArray(symbol) &&
    symbol.length === 1
  ) {
    return symbol[0]
  }
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
    isMarginFundingPayment
  } = params
  const filter = {
    _dateFieldName: dateFieldName,
    start,
    end,
    ...additionalFilteringProps
  }

  if (
    typeof isMarginFundingPayment === 'boolean' &&
    Object.keys(model)
      .some(key => key === '_isMarginFundingPayment')
  ) {
    filter._isMarginFundingPayment = Number(isMarginFundingPayment)
  }

  const symbFilter = _getSymbFilter(params)

  if (symbFilter) {
    filter[symbolFieldName] = symbFilter
  }

  return filter
}
