'use strict'

module.exports = (user, isSubAccount, isSubUser) => {
  const { masterUserId, username: uName } = { ...user }
  const subAccountNameEnding = isSubAccount
    ? '-sub-account'
    : ''
  const subUserNameEnding = isSubUser
    ? `-sub-user-${masterUserId}`
    : ''
  const username = `${uName}${subAccountNameEnding}${subUserNameEnding}`

  return username
}
