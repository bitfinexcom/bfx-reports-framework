'use strict'

module.exports = (params) => {
  const {
    logger,
    delistedCcyMap,
    symbol,
    err
  } = params ?? {}

  logger.debug(err)

  if (delistedCcyMap.has(symbol)) {
    delistedCcyMap.get(symbol).push(err)

    return delistedCcyMap
  }

  delistedCcyMap.set(symbol, [err])

  return delistedCcyMap
}
