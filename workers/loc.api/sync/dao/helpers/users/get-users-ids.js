'use strict'

module.exports = (users) => {
  return users
    .filter((user) => {
      const { _id } = { ...user }

      return Number.isInteger(_id)
    })
    .map(({ _id }) => _id)
}
