'use strict'

const getWhereQuery = require('./get-where-query')
const getOrderQuery = require('./get-order-query')

module.exports = (params) => {
  const {
    name
  } = params ?? {}
  const filter = params?.subQuery?.filter ?? {}
  const sort = params?.subQuery?.sort ?? []

  const alias = `${name}_sub_q`
  const {
    where,
    values
  } = getWhereQuery(
    filter,
    { alias }
  )
  const _sort = getOrderQuery(sort)

  if (
    !_sort &&
    !where
  ) {
    return {
      subQuery: name,
      subQueryValues: {}
    }
  }

  const subQuery = `(SELECT * FROM ${name} AS ${alias} ${where} ${_sort})`

  return {
    subQuery,
    subQueryValues: values
  }
}
