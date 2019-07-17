'use strict'

const getOrderQuery = require('./get-order-query')

module.exports = ({
  name,
  subQuery: { sort = [] } = {}
} = {}) => {
  const _sort = getOrderQuery(sort)

  if (!_sort) {
    return name
  }

  return `(SELECT * FROM ${name} ${_sort})`
}
