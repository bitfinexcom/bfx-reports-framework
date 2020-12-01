'use strict'

const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const getInsertableArrayObjectsFilter = require(
  '../get-insertable-array-objects-filter'
)
const getStatusMessagesFilter = require(
  '../get-status-messages-filter'
)

module.exports = (args, methodColl, opts) => {
  const { auth, params } = { ...args }
  const { filter: requestedFilter } = { ...params }
  const { isPublic } = { ...opts }

  const statusMessagesfilter = getStatusMessagesFilter(
    methodColl,
    params
  )
  const insertableArrayObjectsFilter = getInsertableArrayObjectsFilter(
    methodColl,
    params
  )

  const filter = {
    ...insertableArrayObjectsFilter,
    ...statusMessagesfilter
  }

  if (!isPublic) {
    const { _id } = { ...auth }

    if (!Number.isInteger(_id)) {
      throw new AuthError()
    }

    filter.user_id = _id
  }

  return {
    requestedFilter,
    filter
  }
}
