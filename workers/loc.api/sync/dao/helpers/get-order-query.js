'use strict'

const { isEmpty } = require('lodash')

module.exports = (sort = []) => {
  if (
    !sort ||
    !Array.isArray(sort)
  ) {
    return ''
  }

  const _sort = sort.reduce((accum, curr, i) => {
    if (
      Array.isArray(curr) &&
      typeof curr[0] === 'string' &&
      typeof curr[1] === 'number'
    ) {
      accum.push(`${curr[0]} ${curr[1] > 0 ? 'ASC' : 'DESC'}`)
    }

    return accum
  }, [])

  return `${isEmpty(_sort) ? '' : `ORDER BY ${_sort.join(', ')}`}`
}
