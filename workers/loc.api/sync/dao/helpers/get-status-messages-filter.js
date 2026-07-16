'use strict'

const TABLES_NAMES = require('../../schema/tables-names')
const getSymbolFilter = require('./get-symbol-filter')

module.exports = (
  {
    name,
    symbolFieldName
  } = {},
  params = {}
) => {
  if (name !== TABLES_NAMES.STATUS_MESSAGES) {
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
    ...symbFilter
  }

  return filter
}
