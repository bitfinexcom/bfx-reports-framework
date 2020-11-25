'use strict'

module.exports = ({
  limit: limitParam,
  isPrefixed
} = {}) => {
  const key = isPrefixed ? '$_limit' : '_limit'
  const limit = Number.isInteger(limitParam) ? 'LIMIT $_limit' : ''
  const limitVal = limit ? { [key]: limitParam } : {}

  return { limit, limitVal }
}
