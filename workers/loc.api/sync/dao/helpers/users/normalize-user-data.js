'use strict'

const _normalize = (userData) => {
  const {
    active,
    isDataFromDb,
    isSubAccount,
    isSubUser,
    haveSubUsers,
    isNotProtected,
    shouldNotSyncOnStartupAfterUpdate,
    isSyncOnStartupRequired,
    isStagingBfxApi
  } = userData ?? {}

  return {
    ...userData,
    active: !!active,
    isDataFromDb: !!isDataFromDb,
    isSubAccount: !!isSubAccount,
    isSubUser: !!isSubUser,
    haveSubUsers: !!haveSubUsers,
    isNotProtected: !!isNotProtected,
    shouldNotSyncOnStartupAfterUpdate: !!shouldNotSyncOnStartupAfterUpdate,
    isSyncOnStartupRequired: !!isSyncOnStartupRequired,
    isStagingBfxApi: !!isStagingBfxApi
  }
}

module.exports = (userData) => {
  if (
    !userData ||
    typeof userData !== 'object'
  ) {
    return userData
  }

  return Array.isArray(userData)
    ? userData.map(_normalize)
    : _normalize(userData)
}
