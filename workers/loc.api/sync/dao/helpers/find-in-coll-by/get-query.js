'use strict'

const {
  getProjectionQuery,
  getOrderQuery,
  getWhereQuery,
  getGroupQuery,
  getSubQuery,
  getLimitQuery
} = require('..')

const getFilterParams = require('./get-filter-params')

module.exports = (args, methodColl, opts) => {
  const { params } = { ...args }
  const { sort: _sort, model } = { ...methodColl }
  const {
    isPublic,
    additionalModel,
    isExcludePrivate = true
  } = { ...opts }

  const {
    requestedFilter,
    filter
  } = getFilterParams(args, methodColl, { isPublic })

  const _model = { ...model, ...additionalModel }
  const exclude = isPublic ? ['_id', 'user_id'] : ['_id']

  const {
    limit,
    limitVal
  } = getLimitQuery({ ...params })
  const sort = getOrderQuery(_sort)
  const {
    where,
    values
  } = getWhereQuery(
    filter,
    { requestedFilter }
  )
  const {
    group,
    groupProj
  } = getGroupQuery(methodColl)
  const { subQuery, subQueryValues } = getSubQuery(methodColl)
  const projection = getProjectionQuery(
    _model,
    exclude,
    isExcludePrivate
  )
  const delimiter = (
    groupProj.length > 0 &&
    projection.length > 0
  )
    ? ', '
    : ''

  const sql = `SELECT ${groupProj}${delimiter}${projection} FROM ${subQuery}
    ${where}
    ${group}
    ${sort}
    ${limit}`

  return {
    sql,
    sqlParams: { ...values, ...subQueryValues, ...limitVal }
  }
}
