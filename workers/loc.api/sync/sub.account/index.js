'use strict'

const { isEmpty } = require('lodash')

const {
  isSubAccountApiKeys,
  getSubAccountAuthFromAuth,
  getAuthFromSubAccountAuth
} = require('../../helpers')
const {
  SubAccountCreatingError,
  SubAccountRemovingError
} = require('../../errors')

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../../di/types')

class SubAccount {
  constructor (
    dao,
    TABLES_NAMES,
    rService,
    authenticator
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.rService = rService
    this.authenticator = authenticator
  }

  async createSubAccount (args) {
    const { params } = { ...args }
    const {
      email,
      password,
      subAccountPassword,
      jwt,
      subAccountApiKeys
    } = { ...params }

    const masterUser = await this.authenticator
      .verifyUser(
        {
          auth: {
            email,
            password,
            jwt
          }
        },
        {
          projection: [
            'id',
            'email',
            'apiKey',
            'apiSecret',
            'timezone',
            'username'
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
      const { _id, email, jwt } = await this.authenticator
        .signUp(
          { auth: subAccount },
          {
            isDisabledApiKeysVerification: true,
            isReturnedId: true,
            isNotSetSession: true,
            isSubAccount: true
          }
        )

      const subUsersAuth = [
        ...subAccountApiKeys,
        masterUser
      ]

      const subUsersKeys = []

      for (const subUserAuth of subUsersAuth) {
        const {
          apiKey,
          apiSecret,
          password,
          email,
          jwt
        } = { ...subUserAuth }

        const isAuthCheckedInDb = (
          (
            email &&
            typeof email === 'string' &&
            password &&
            typeof password === 'string'
          ) ||
          (
            jwt &&
            typeof jwt === 'string'
          )
        )
        const auth = isAuthCheckedInDb
          ? await this.authenticator.verifyUser(
            {
              auth: {
                email,
                password,
                jwt
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
              isDecryptedApiKeys: true
            }
          )
          : { apiKey, apiSecret }

        if (
          subUsersKeys.some(item => (
            auth.apiKey === item.apiKey &&
            auth.apiSecret === item.apiSecret
          ))
        ) {
          continue
        }

        const { _id: subUserId } = await this.authenticator
          .signUp(
            {
              auth: {
                ...auth,
                password: _subAccountPassword
              }
            },
            {
              isDisabledApiKeysVerification: isAuthCheckedInDb,
              isReturnedId: true,
              isNotSetSession: true,
              isSubUser: true
            }
          )

        subUsersKeys.push({
          apiKey: auth.apiKey,
          apiSecret: auth.apiSecret
        })

        await this.insertElemToDb(
          this.TABLES_NAMES.SUB_ACCOUNTS,
          {
            masterUserId: _id,
            subUserId
          }
        )
      }

      this.setUserSession(
        { _id, email, jwt }
      )

      return {
        email,
        isSubAccount: true,
        jwt
      }
    })
  }

  async removeSubAccount (args) {
    const { auth } = { ...args }

    if (isSubAccountApiKeys(auth)) {
      throw new SubAccountRemovingError()
    }

    const user = await this.dao.checkAuthInDb(args)
    const masterUserAuth = getSubAccountAuthFromAuth(user)
    const masterUser = await this.dao.checkAuthInDb(
      { auth: masterUserAuth },
      false
    )

    await this.dao.removeSubAccount(masterUser)
  }

  async hasSubAccount (args) {
    const { auth } = { ...args }
    const _auth = getAuthFromSubAccountAuth(auth)

    try {
      const user = await this.dao.checkAuthInDb(
        { auth: _auth },
        false
      )
      const masterUserAuth = getSubAccountAuthFromAuth(user)
      const subUsers = await this.dao.getSubUsersByMasterUserApiKeys(
        masterUserAuth
      )
      const hasSubUsersMoreThanOne = (
        Array.isArray(subUsers) &&
        subUsers.length > 0 &&
        subUsers.every((sUser) => !isEmpty(sUser))
      )

      return hasSubUsersMoreThanOne
    } catch (err) {
      return false
    }
  }
}

decorate(injectable(), SubAccount)
decorate(inject(TYPES.DAO), SubAccount, 0)
decorate(inject(TYPES.TABLES_NAMES), SubAccount, 1)
decorate(inject(TYPES.RService), SubAccount, 2)
decorate(inject(TYPES.Authenticator), SubAccount, 3)

module.exports = SubAccount
