'use strict'

/*
 * Converts 'getFundingOfferHistory' name to 'FUNDING_OFFER_HISTORY'
 */
module.exports = (method) => {
  return method
    .replace(/^[^A-Z]+/, '')
    .replace(/[A-Z]/g, (match, offset) => (
      `${offset > 0 ? '_' : ''}${match.toLowerCase()}`
    ))
    .toUpperCase()
}
