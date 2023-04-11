'use strict'

const pickProps = require('./pick-props')

module.exports = (session, isReturnedPassword) => {
  const passwordProp = isReturnedPassword
    ? ['password', 'isNotProtected']
    : []
  const allowedProps = [
    '_id',
    'id',
    'email',
    'authToken',
    'authTokenFn',
    'apiKey',
    'apiSecret',
    'active',
    'isDataFromDb',
    'timezone',
    'username',
    'localUsername',
    'isSubAccount',
    'isSubUser',
    'subUsers',
    'token',
    'shouldNotSyncOnStartupAfterUpdate',
    'isSyncOnStartupRequired',
    'authTokenTTLSec',
    ...passwordProp
  ]
  const { subUsers: reqSubUsers } = { ...session }
  const subUsers = pickProps(reqSubUsers, allowedProps)
  const data = { ...session, subUsers }

  return pickProps(data, allowedProps)
}
