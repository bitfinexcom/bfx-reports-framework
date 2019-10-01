'use strict'

const ALLOWED_COLLS = require('../../allowed.colls')
const getSymbolFilter = require('./get-symbol-filter')

module.exports = (
  {
    name,
    symbolFieldName,
    additionalFilteringProps
  } = {},
  params = {}
) => {
  if (name !== ALLOWED_COLLS.STATUS_MESSAGES) {
    return {}
  }

  const {
    type,
    symbol,
    filter: reqFilter = {}
  } = { ...params }
  const symbFilter = getSymbolFilter(symbol, symbolFieldName)
  const filter = {
    ...reqFilter,
    _type: type,
    ...additionalFilteringProps,
    ...symbFilter
  }

  return filter
}
