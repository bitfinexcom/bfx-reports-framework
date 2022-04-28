'use strict'

module.exports = ({
  groupFns = [],
  groupResBy = []
} = {}) => {
  const group = (
    Array.isArray(groupResBy) &&
    groupResBy.length > 0
  )
    ? `GROUP BY ${groupResBy.join(', ')}`
    : ''
  const groupProj = (
    Array.isArray(groupFns) &&
    groupFns.length > 0
  )
    ? `${groupFns.join(', ')} `
    : ''

  return { group, groupProj }
}
