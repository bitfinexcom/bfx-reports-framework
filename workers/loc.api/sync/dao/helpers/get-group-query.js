'use strict'

module.exports = ({
  groupResBy = []
} = {}) => {
  return (
    Array.isArray(groupResBy) &&
    groupResBy.length > 0
  )
    ? `GROUP BY ${groupResBy.join(', ')}`
    : ''
}
