'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')
const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const TYPES = require('../../di/types')
const {
  isSubAccountApiKeys,
  getSubAccountAuthFromAuth
} = require('../../helpers')
const {
  SubAccountCreatingError
} = require('../../errors')

class SubAccount {
  constructor (
    dao,
    TABLES_NAMES,
    authenticator
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.authenticator = authenticator
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
            'password'
          ],
          isDecryptedApiKeys: true,
          isReturnedPassword: true
        }
      )

    const _subAccountPassword = (
      subAccountPassword &&
      typeof subAccountPassword === 'string'
    )
      ? subAccountPassword
      : masterUser.password

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
      password: _subAccountPassword
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
            isNotInTrans: true
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
              isNotInTrans: true
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
                password: _subAccountPassword
              }
            },
            {
              isDisabledApiKeysVerification: isAuthCheckedInDb,
              isReturnedFullUserData: true,
              isNotSetSession: true,
              isSubUser: true,
              isNotInTrans: true,
              masterUserId: masterUser.id
            }
          )

        subUsers.push(subUser)

        await this.dao.insertElemToDb(
          this.TABLES_NAMES.SUB_ACCOUNTS,
          {
            masterUserId: _id,
            subUserId: subUser._id
          }
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
            isNotInTrans: true
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
              isSubUser: true
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
    })
  }
}

decorate(injectable(), SubAccount)
decorate(inject(TYPES.DAO), SubAccount, 0)
decorate(inject(TYPES.TABLES_NAMES), SubAccount, 1)
decorate(inject(TYPES.Authenticator), SubAccount, 2)

module.exports = SubAccount
