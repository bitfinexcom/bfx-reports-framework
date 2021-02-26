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
const TABLES_NAMES = require('../../../schema/tables-names')

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
    const { _id, isSubAccount } = { ...auth }

    if (!Number.isInteger(_id)) {
      throw new AuthError()
    }
    if (
      methodColl.name === TABLES_NAMES.LEDGERS &&
      isSubAccount
    ) {
      filter._isBalanceRecalced = 1
    }

    filter.user_id = _id
  }

  return {
    requestedFilter,
    filter
  }
}
