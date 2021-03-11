'use strict'

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

const { decorateInjectable } = require('../../di/utils')

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
    const { auth, params } = { ...args }
    const {
      email,
      password,
      token
    } = { ...auth }
    const {
      subAccountPassword,
      subAccountApiKeys
    } = { ...params }

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
          isReturnedPassword: true,
          withoutWorkerThreads: true
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
      !Array.isArray(subAccountApiKeys) ||
      subAccountApiKeys.length === 0 ||
      subAccountApiKeys.some(isSubAccountApiKeys)
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
            withoutWorkerThreads: true
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
        } = { ...subUserAuth }

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
                withoutWorkerThreads: true
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
              masterUserId: masterUser.id,
              withoutWorkerThreads: true
            }
          )

        subUsers.push(subUser)

        await this.dao.insertElemToDb(
          this.TABLES_NAMES.SUB_ACCOUNTS,
          {
            masterUserId: _id,
            subUserId: subUser._id
          },
          { withoutWorkerThreads: true }
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
    }, { withoutWorkerThreads: true })
  }

  async recoverPassword (args) {
    const { auth, params } = { ...args }
    const {
      apiKey,
      apiSecret,
      newPassword,
      isSubAccount,
      isNotProtected
    } = { ...auth }
    const {
      subAccountApiKeys
    } = { ...params }

    if (
      !isSubAccount ||
      !Array.isArray(subAccountApiKeys) ||
      subAccountApiKeys.length === 0
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
            withoutWorkerThreads: true
          }
        )
      const {
        subUsers,
        email,
        isSubAccount,
        token
      } = { ...subAccount }

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
        } = { ...subUserAuth }
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
              isSubUser: true,
              withoutWorkerThreads: true
            }
          )
        const isNotExistInDb = subUsers.every((subUser) => {
          const { _id } = { ...subUser }

          return refreshedSubUser._id !== _id
        })

        if (isNotExistInDb) {
          throw new AuthError()
        }
      }

      return {
        email,
        isSubAccount,
        token
      }
    }, { withoutWorkerThreads: true })
  }

  async updateSubAccount (args) {
    const { auth: subAccountAuth, params } = { ...args }
    const {
      addingSubUsers = [],
      removingSubUsersByEmails = []
    } = { ...params }

    await this.dao.updateRecordOf(
      this.TABLES_NAMES.SCHEDULER,
      { isEnable: false }
    )
    await this.sync.stop()

    const res = await this.dao.executeQueriesInTrans(async () => {
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
            isNotSetSession: true,
            withoutWorkerThreads: true
          }
        )

      if (
        !isSubAccountApiKeys(subAccountUser) ||
        !Array.isArray(addingSubUsers) ||
        !Array.isArray(removingSubUsersByEmails) ||
        (
          addingSubUsers.length === 0 &&
          removingSubUsersByEmails.length === 0
        ) ||
        addingSubUsers.some(isSubAccountApiKeys) ||
        removingSubUsersByEmails.some((user) => (
          !user ||
          typeof user !== 'object' ||
          typeof user.email !== 'string'
        ))
      ) {
        throw new SubAccountUpdatingError()
      }

      const { _id, email, token, subUsers } = subAccountUser

      const masterUser = subUsers.find((subUser) => {
        const { email: _email } = { ...subUser }

        return _email === email
      })

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
        } = { ...subUserAuth }

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
                withoutWorkerThreads: true
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

        const subUser = await this.authenticator
          .signUp(
            {
              auth: {
                ...auth,
                password: subAccountUser.password
              }
            },
            {
              isDisabledApiKeysVerification: isAuthCheckedInDb,
              isReturnedFullUserData: true,
              isNotSetSession: true,
              isSubUser: true,
              isNotInTrans: true,
              masterUserId: masterUser.id,
              withoutWorkerThreads: true
            }
          )

        await this.dao.insertElemToDb(
          this.TABLES_NAMES.SUB_ACCOUNTS,
          {
            masterUserId: _id,
            subUserId: subUser._id
          },
          { withoutWorkerThreads: true }
        )

        processedSubUsers.push(subUser)
        addedSubUsers.push(subUser)
      }

      const removingSubUsers = subUsers.filter((subUser) => (
        Array.isArray(removingSubUsersByEmails) &&
        removingSubUsersByEmails.some((removingSubUserByEmail) => {
          const { email } = { ...removingSubUserByEmail }

          return email === subUser.email
        })
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
          { withoutWorkerThreads: true }
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
          { withoutWorkerThreads: true }
        )
      }

      this.authenticator.setUserSession({
        ...subAccountUser,
        subUsers: processedSubUsers
      })

      return {
        email,
        isSubAccount: true,
        token
      }
    }, { withoutWorkerThreads: true })

    await this.dao.updateRecordOf(
      this.TABLES_NAMES.SCHEDULER,
      { isEnable: true }
    )
    await this.sync.start(true)

    return res
  }
}

decorateInjectable(SubAccount, depsTypes)

module.exports = SubAccount
