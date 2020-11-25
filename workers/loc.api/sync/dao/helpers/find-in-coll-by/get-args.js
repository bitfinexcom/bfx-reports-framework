'use strict'

const {
  getLimitNotMoreThan
} = require('bfx-report/workers/loc.api/helpers')

module.exports = (args, methodColl) => {
  const _args = { ...args }
  const { params } = _args
  const _params = { ...params }
  const { limit } = _params
  const { maxLimit } = { ...methodColl }

  _params.limit = maxLimit
    ? getLimitNotMoreThan(limit, maxLimit)
    : null

  _args.params = _params

  return _args
}
