'use strict'

const TABLES_NAMES = require('../../schema/tables-names')
const getSymbolFilter = require('./get-symbol-filter')

module.exports = (
  {
    name,
    symbolFieldName
  } = {},
  args
) => {
  if (name !== TABLES_NAMES.STATUS_MESSAGES) {
    return {}
  }

  const {
    type,
    symbol,
    filter: reqFilter = {}
  } = args?.params ?? {}
  const symbFilter = getSymbolFilter(symbol, symbolFieldName)
  const filter = {
    ...reqFilter,
    _type: type,
    ...symbFilter
  }

  return filter
}
