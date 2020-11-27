'use strict'

module.exports = (users, subUsers) => {
  return users.map((user) => {
    const { _id } = { ...user }
    const requiredSubUsers = subUsers.filter((subUser) => {
      const { masterUserId } = { ...subUser }

      return (
        Number.isInteger(masterUserId) &&
        masterUserId === _id
      )
    })

    return {
      ...user,
      subUsers: requiredSubUsers
    }
  })
}
