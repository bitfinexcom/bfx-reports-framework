'use strict'

const {
  AuthError
} = require('@bitfinex/bfx-report/workers/loc.api/errors')

const getInsertableArrayObjectsFilter = require(
  '../get-insertable-array-objects-filter'
)
const getStatusMessagesFilter = require(
  '../get-status-messages-filter'
)
const getLedgersFilter = require(
  '../get-ledgers-filter'
)
const SUPPORTED_MODEL_FIELDS = require(
  '../../../schema/sync-schema/model/supported.model.fields'
)

module.exports = (args, methodColl, opts) => {
  const { auth, params } = args ?? {}
  const { filter: requestedFilter } = params ?? {}
  const { isPublic } = opts ?? {}

  const statusMessagesfilter = getStatusMessagesFilter(
    methodColl,
    args
  )
  const insertableArrayObjectsFilter = getInsertableArrayObjectsFilter(
    methodColl,
    args
  )
  const ledgersFilter = getLedgersFilter(
    methodColl,
    args
  )

  const filter = {
    ...insertableArrayObjectsFilter,
    ...statusMessagesfilter,
    ...ledgersFilter,
    ...methodColl[SUPPORTED_MODEL_FIELDS.ADDITIONAL_FILTERING_PROPS]
  }

  if (isPublic) {
    return {
      requestedFilter,
      filter
    }
  }

  if (!Number.isInteger(auth?._id)) {
    throw new AuthError()
  }

  filter.user_id = auth._id

  return {
    requestedFilter,
    filter
  }
}
