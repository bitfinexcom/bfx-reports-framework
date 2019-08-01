'use strict'

module.exports = ({ limit: limitParam } = {}) => {
  const limit = Number.isInteger(limitParam) ? 'LIMIT $_limit' : ''
  const limitVal = limit ? { $_limit: limitParam } : {}

  return { limit, limitVal }
}
