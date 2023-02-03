'use strict'

const { orderBy } = require('lodash')

const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const {
  isSubAccountApiKeys,
  getSubAccountAuthFromAuth
} = require('../../helpers')
const {
  SubAccountCreatingError,
  SubAccountUpdatingError,
  UserRemovingError
} = require('../../errors')
const SyncTempTablesManager = require(
  '../data.inserter/sync.temp.tables.manager'
)

const { decorateInjectable } = require('../../di/utils')

/*
 * There're restrictions existed
 * for using `authToken` with sub-accounts
 */
const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.TABLES_NAMES,
  TYPES.Authenticator,
  TYPES.Sync
]
class SubAccount {
  constructor (
    dao,
    TABLES_NAMES,
    authenticator,
    sync
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.authenticator = authenticator
    this.sync = sync
  }

  async createSubAccount (args) {
    const {
      email,
      password,
      token
    } = args?.auth ?? {}
    const {
      subAccountPassword,
      subAccountApiKeys
    } = args?.params ?? {}

    const masterUser = await this.authenticator
      .verifyUser(
        {
          auth: {
            email,
            password,
            token
          }
        },
        {
          projection: [
            'id',
            'email',
            'apiKey',
            'apiSecret',
            'timezone',
            'username',
            'password',
            'isNotProtected'
          ],
          isDecryptedApiKeys: true,
          isReturnedPassword: true
        }
      )

    const isSubAccountPwdEntered = (
      subAccountPassword &&
      typeof subAccountPassword === 'string'
    )
    const _subAccountPassword = isSubAccountPwdEntered
      ? subAccountPassword
      : masterUser.password
    const isNotProtected = (
      !isSubAccountPwdEntered &&
      masterUser.isNotProtected
    )

    if (
      isSubAccountApiKeys(masterUser) ||
      masterUser?.authToken ||
      !Array.isArray(subAccountApiKeys) ||
      subAccountApiKeys.length === 0 ||
      subAccountApiKeys.some((subUserAuth) => (
        isSubAccountApiKeys(subUserAuth) ||
        subUserAuth?.authToken
      ))
    ) {
      throw new SubAccountCreatingError()
    }

    const subAccount = {
      ...masterUser,
      ...getSubAccountAuthFromAuth(masterUser),
      password: _subAccountPassword,
      isNotProtected
    }

    return this.dao.executeQueriesInTrans(async () => {
      const subAccountUser = await this.authenticator
        .signUp(
          { auth: subAccount },
          {
            isDisabledApiKeysVerification: true,
            isReturnedFullUserData: true,
            isNotSetSession: true,
            isSubAccount: true,
            isNotInTrans: true,
            doNotQueueQuery: true
          }
        )
      const { _id, email, token } = subAccountUser

      const subUsersAuth = [
        ...subAccountApiKeys,
        masterUser
      ]

      const subUsers = []
      let isSubUserFromMasterCreated = false
      let subUsersCount = 0

      for (const subUserAuth of subUsersAuth) {
        subUsersCount += 1
        const isLastSubUser = subUsersAuth.length === subUsersCount

        const {
          apiKey,
          apiSecret,
          password,
          email,
          token
        } = subUserAuth ?? {}

        const isAuthCheckedInDb = (
          (
            email &&
            typeof email === 'string'
          ) ||
          (
            token &&
            typeof token === 'string'
          )
        )
        const auth = isAuthCheckedInDb
          ? await this.authenticator.verifyUser(
            {
              auth: {
                email,
                password,
                token
              }
            },
            {
              projection: [
                '_id',
                'id',
                'email',
                'apiKey',
                'apiSecret',
                'timezone',
                'username'
              ],
              isDecryptedApiKeys: true,
              isNotInTrans: true,
              doNotQueueQuery: true
            }
          )
          : { apiKey, apiSecret }

        if (
          isLastSubUser &&
          isSubUserFromMasterCreated &&
          masterUser.apiKey === auth.apiKey &&
          masterUser.apiSecret === auth.apiSecret &&
          subUsers.length === 1
        ) {
          throw new SubAccountCreatingError()
        }
        if (
          subUsers.some(item => (
            auth.apiKey === item.apiKey &&
            auth.apiSecret === item.apiSecret
          ))
        ) {
          continue
        }
        if (auth?.authToken) {
          throw new SubAccountCreatingError()
        }

        const subUser = await this.authenticator
          .signUp(
            {
              auth: {
                ...auth,
                password: _subAccountPassword,
                isNotProtected
              }
            },
            {
              isDisabledApiKeysVerification: isAuthCheckedInDb,
              isReturnedFullUserData: true,
              isNotSetSession: true,
              isSubUser: true,
              isNotInTrans: true,
              doNotQueueQuery: true,
              masterUserId: masterUser.id
            }
          )

        subUsers.push(subUser)

        await this.dao.insertElemToDb(
          this.TABLES_NAMES.SUB_ACCOUNTS,
          {
            masterUserId: _id,
            subUserId: subUser._id
          },
          { doNotQueueQuery: true }
        )

        if (
          masterUser.apiKey === subUser.apiKey &&
          masterUser.apiSecret === subUser.apiSecret
        ) {
          isSubUserFromMasterCreated = true
        }
      }

      this.authenticator
        .setUserSession({ ...subAccountUser, subUsers })

      return {
        email,
        isSubAccount: true,
        token
      }
    })
  }

  async recoverPassword (args) {
    const {
      authToken,
      apiKey,
      apiSecret,
      newPassword,
      isSubAccount,
      isNotProtected
    } = args?.auth ?? {}
    const {
      subAccountApiKeys
    } = args?.params ?? {}

    if (
      authToken ||
      !isSubAccount ||
      !Array.isArray(subAccountApiKeys) ||
      subAccountApiKeys.length === 0 ||
      subAccountApiKeys.some((subUserAuth) => (
        subUserAuth?.authToken
      ))
    ) {
      throw new AuthError()
    }

    return this.dao.executeQueriesInTrans(async () => {
      const subAccount = await this.authenticator
        .recoverPassword(
          args,
          {
            isReturnedUser: true,
            isNotInTrans: true,
            doNotQueueQuery: true
          }
        )
      const {
        subUsers,
        email,
        isSubAccount,
        token
      } = subAccount ?? {}

      if (
        !Array.isArray(subUsers) ||
        subUsers.length === 0
      ) {
        throw new AuthError()
      }

      const subUsersAuth = [
        ...subAccountApiKeys,
        { apiKey, apiSecret }
      ]

      for (const subUserAuth of subUsersAuth) {
        const {
          apiKey,
          apiSecret
        } = subUserAuth ?? {}
        const refreshedSubUser = await this.authenticator
          .recoverPassword(
            {
              auth: {
                apiKey,
                apiSecret,
                newPassword,
                isNotProtected
              }
            },
            {
              isReturnedUser: true,
              isNotInTrans: true,
              doNotQueueQuery: true,
              isSubUser: true
            }
          )
        const isNotExistInDb = subUsers.every((subUser) => (
          refreshedSubUser._id !== subUser?._id
        ))

        if (isNotExistInDb) {
          throw new AuthError()
        }
      }

      return {
        email,
        isSubAccount,
        token
      }
    })
  }

  async updateSubAccount (args) {
    const { auth: subAccountAuth, params } = args ?? {}
    const {
      addingSubUsers = [],
      removingSubUsersByEmails = []
    } = params ?? {}

    await this.dao.updateRecordOf(
      this.TABLES_NAMES.SCHEDULER,
      { isEnable: false }
    )
    await this.sync.stop()

    const {
      subAccountUser,
      res
    } = await this.dao.executeQueriesInTrans(async () => {
      const subAccountUser = await this.authenticator
        .signIn(
          {
            auth: {
              ...subAccountAuth,
              isSubAccount: true
            }
          },
          {
            isReturnedUser: true,
            isNotInTrans: true,
            doNotQueueQuery: true,
            isNotSetSession: true
          }
        )

      if (
        subAccountUser?.authToken ||
        !isSubAccountApiKeys(subAccountUser) ||
        !Array.isArray(addingSubUsers) ||
        !Array.isArray(removingSubUsersByEmails) ||
        (
          addingSubUsers.length === 0 &&
          removingSubUsersByEmails.length === 0
        ) ||
        addingSubUsers.some((subUserAuth) => (
          isSubAccountApiKeys(subUserAuth) ||
          subUserAuth?.authToken
        )) ||
        removingSubUsersByEmails.some((user) => (
          typeof user?.email !== 'string'
        ))
      ) {
        throw new SubAccountUpdatingError()
      }

      const {
        _id,
        email,
        token,
        subUsers,
        isNotProtected
      } = subAccountUser

      const masterUser = subUsers.find((subUser) => (
        subUser?.email === email
      ))

      const addingSubUsersAuth = [
        ...addingSubUsers,
        masterUser
      ]
      const processedSubUsers = []
      const addedSubUsers = []

      for (const subUserAuth of addingSubUsersAuth) {
        const {
          apiKey,
          apiSecret,
          password,
          email,
          token
        } = subUserAuth ?? {}

        const isAuthCheckedInDb = (
          (
            email &&
            typeof email === 'string'
          ) ||
          (
            token &&
            typeof token === 'string'
          )
        )
        const auth = isAuthCheckedInDb
          ? await this.authenticator.verifyUser(
            {
              auth: {
                email,
                password,
                token
              }
            },
            {
              projection: [
                '_id',
                'id',
                'email',
                'apiKey',
                'apiSecret',
                'timezone',
                'username'
              ],
              isDecryptedApiKeys: true,
              isNotInTrans: true,
              doNotQueueQuery: true
            }
          )
          : { apiKey, apiSecret }

        const existedSubUser = subUsers.find((subUser) => (
          auth.apiKey === subUser.apiKey &&
          auth.apiSecret === subUser.apiSecret
        ))
        const isSubUserExisted = (
          existedSubUser &&
          typeof existedSubUser === 'object'
        )
        const isSubUserAddingSkiped = (
          isSubUserExisted ||
          (
            masterUser.apiKey === auth.apiKey &&
            masterUser.apiSecret === auth.apiSecret
          ) ||
          processedSubUsers.some(item => (
            auth.apiKey === item.apiKey &&
            auth.apiSecret === item.apiSecret
          ))
        )

        if (isSubUserAddingSkiped) {
          if (isSubUserExisted) {
            processedSubUsers.push(existedSubUser)
          }

          continue
        }
        if (auth?.authToken) {
          throw new SubAccountUpdatingError()
        }

        const subUser = await this.authenticator
          .signUp(
            {
              auth: {
                ...auth,
                password: subAccountUser.password,
                isNotProtected
              }
            },
            {
              isDisabledApiKeysVerification: isAuthCheckedInDb,
              isReturnedFullUserData: true,
              isNotSetSession: true,
              isSubUser: true,
              isNotInTrans: true,
              doNotQueueQuery: true,
              masterUserId: masterUser.id
            }
          )

        await this.dao.insertElemToDb(
          this.TABLES_NAMES.SUB_ACCOUNTS,
          {
            masterUserId: _id,
            subUserId: subUser._id
          },
          { doNotQueueQuery: true }
        )

        processedSubUsers.push(subUser)
        addedSubUsers.push(subUser)
      }

      const removingSubUsers = subUsers.filter((subUser) => (
        Array.isArray(removingSubUsersByEmails) &&
        removingSubUsersByEmails.some((removingSubUserByEmail) => (
          removingSubUserByEmail?.email === subUser.email
        ))
      ))

      if (removingSubUsers.length > 0) {
        const removingRes = await this.dao.removeElemsFromDb(
          this.TABLES_NAMES.USERS,
          null,
          {
            $in: {
              _id: removingSubUsers.map(({ _id }) => _id)
            }
          },
          { doNotQueueQuery: true }
        )

        if (
          removingRes &&
          removingRes.changes < 1
        ) {
          throw new UserRemovingError()
        }
      }
      if (
        addedSubUsers.length > 0 ||
        removingSubUsers.length > 0
      ) {
        await this.dao.updateCollBy(
          this.TABLES_NAMES.LEDGERS,
          { user_id: _id },
          { _isBalanceRecalced: null },
          { doNotQueueQuery: true }
        )

        const tempTableNames = await SyncTempTablesManager._getTempTableNamesByPattern(
          this.TABLES_NAMES.LEDGERS,
          { dao: this.dao },
          { doNotQueueQuery: true }
        )

        for (const ledgersTempTableName of tempTableNames) {
          await this.dao.updateCollBy(
            ledgersTempTableName,
            { user_id: _id },
            { _isBalanceRecalced: null },
            { doNotQueueQuery: true }
          )
        }
      }

      const refreshedSubUsers = orderBy(
        [...subUsers, ...addedSubUsers],
        ['_id'],
        ['asc']
      ).filter((subUser) => (
        removingSubUsers.every(({ _id }) => _id !== subUser?._id)
      ))
      const refreshedSubAccountUser = {
        ...subAccountUser,
        subUsers: refreshedSubUsers
      }

      this.authenticator.setUserSession(refreshedSubAccountUser)

      return {
        subAccountUser: refreshedSubAccountUser,
        res: {
          email,
          isSubAccount: true,
          token
        }
      }
    })

    await this.dao.updateRecordOf(
      this.TABLES_NAMES.SCHEDULER,
      { isEnable: true }
    )
    await this.sync.start({
      isSolveAfterRedirToApi: true,
      ownerUserId: subAccountUser?._id
    })

    return res
  }
}

decorateInjectable(SubAccount, depsTypes)

module.exports = SubAccount
