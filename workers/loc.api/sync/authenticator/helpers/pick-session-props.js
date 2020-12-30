'use strict'

const pickProps = require('./pick-props')

module.exports = (session, isReturnedPassword) => {
  const passwordProp = isReturnedPassword
    ? ['password']
    : []
  const allowedProps = [
    '_id',
    'id',
    'email',
    'apiKey',
    'apiSecret',
    'active',
    'isDataFromDb',
    'timezone',
    'username',
    'isSubAccount',
    'isSubUser',
    'subUsers',
    'token',
    ...passwordProp
  ]
  const { subUsers: reqSubUsers } = { ...session }
  const subUsers = pickProps(reqSubUsers, allowedProps)
  const data = { ...session, subUsers }

  return pickProps(data, allowedProps)
}
