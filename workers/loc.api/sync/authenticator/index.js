'use strict'

const { v4: uuidv4 } = require('uuid')
const { pick } = require('lodash')
const {
  decorate,
  injectable,
  inject
} = require('inversify')
const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const TYPES = require('../../di/types')
const { serializeVal } = require('../dao/helpers')
const { isSubAccountApiKeys } = require('../../helpers')
const {
  UserRemovingError
} = require('../../errors')

class Authenticator {
  constructor (
    dao,
    TABLES_NAMES,
    rService,
    crypto
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.rService = rService
    this.crypto = crypto

    /**
     * It may only work for one grenache worker instance
     */
    this.userSessions = new Map()
  }

  async signUp (args, params) {
    const { auth } = { ...args }
    const {
      apiKey,
      apiSecret,
      password: userPwd,
      isNotProtected
    } = { ...auth }
    const password = isNotProtected
      ? this.crypto.getSecretKey()
      : userPwd
    const {
      active = true,
      isDataFromDb = true,
      isSubAccount = false,
      isSubUser = false,
      isDisabledApiKeysVerification = false,
      isReturnedFullUserData = false,
      isNotSetSession = false,
      isNotInTrans = false,
      masterUserId
    } = { ...params }

    if (
      !apiKey ||
      typeof apiKey !== 'string' ||
      !apiSecret ||
      typeof apiSecret !== 'string' ||
      !password ||
      typeof password !== 'string' ||
      (
        !isDisabledApiKeysVerification &&
        isSubAccountApiKeys({ apiKey, apiSecret })
      ) ||
      (isSubAccount && isSubUser)
    ) {
      throw new AuthError()
    }

    const {
      email,
      timezone,
      username: uName,
      id
    } = isDisabledApiKeysVerification
      ? { ...auth }
      : await this.rService._checkAuthInApi(args)

    const username = this.generateSubUserName(
      { masterUserId, username: uName },
      isSubAccount,
      isSubUser
    )

    const userFromDb = isDisabledApiKeysVerification
      ? null
      : await this.getUser(
        { email, username, isSubAccount, isSubUser },
        { isNotInTrans }
      )

    if (
      !email ||
      typeof email !== 'string' ||
      (
        userFromDb &&
        typeof userFromDb === 'object' &&
        Number.isInteger(userFromDb._id)
      )
    ) {
      throw new AuthError()
    }

    const [
      encryptedApiKey,
      encryptedApiSecret,
      passwordHash
    ] = await Promise.all([
      this.crypto.encrypt(apiKey, password),
      this.crypto.encrypt(apiSecret, password),
      this.crypto.hashPassword(password)
    ])

    const user = await this.createUser(
      {
        email,
        timezone,
        username,
        id,
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        active: serializeVal(active),
        isDataFromDb: serializeVal(isDataFromDb),
        isSubAccount: serializeVal(isSubAccount),
        isSubUser: serializeVal(isSubUser),
        passwordHash
      },
      { isNotInTrans }
    )

    const token = uuidv4()
    const fullUserData = {
      ...user,
      subUsers: [],
      apiKey,
      apiSecret,
      password,
      token
    }
    const userParam = isReturnedFullUserData
      ? fullUserData
      : {
        email,
        isSubAccount: user.isSubAccount,
        token
      }

    if (!isNotSetSession) {
      /**
       * It stores a password only in memory to allow users
       * to create sub-account with the same password of
       * master user don't ask the user when auth by token
       */
      this.setUserSession(fullUserData)
    }

    return { ...userParam }
  }

  async signIn (args, params) {
    const { auth } = { ...args }
    const {
      email,
      password,
      isSubAccount,
      token
    } = { ...auth }
    const {
      active = true,
      isDataFromDb = true,
      isReturnedUser
    } = { ...params }

    const user = await this.verifyUser(
      {
        auth: {
          email,
          password,
          isSubAccount,
          token
        }
      },
      {
        isDecryptedApiKeys: true,
        isFilledSubUsers: true,
        isReturnedPassword: true
      }
    )
    const {
      _id,
      email: emailFromDb,
      isSubAccount: isSubAccountFromDb,
      apiKey,
      apiSecret
    } = { ...user }

    const {
      id,
      timezone,
      username: uName,
      email: emailFromApi
    } = await this.rService._checkAuthInApi({
      auth: { apiKey, apiSecret }
    })
    const username = this.generateSubUserName(
      { username: uName },
      isSubAccountFromDb
    )

    const freshUserData = {
      id,
      timezone,
      username,
      email: emailFromApi,
      active: active === null
        ? user.active
        : active,
      isDataFromDb: isDataFromDb === null
        ? user.isDataFromDb
        : isDataFromDb
    }
    const res = await this.dao.updateCollBy(
      this.TABLES_NAMES.USERS,
      { _id, email: emailFromDb },
      {
        ...freshUserData,
        active: serializeVal(freshUserData.active),
        isDataFromDb: serializeVal(freshUserData.isDataFromDb)
      }
    )

    if (res && res.changes < 1) {
      throw new AuthError()
    }

    const refreshedUser = {
      ...user,
      ...freshUserData
    }
    const returnedUser = isReturnedUser
      ? refreshedUser
      : {}

    const existedToken = (
      token &&
      typeof token === 'string'
    )
      ? token
      : this.getUserSessionByEmail({ email, isSubAccount }).token
    const createdToken = (
      existedToken &&
      typeof existedToken === 'string'
    )
      ? existedToken
      : uuidv4()

    this.setUserSession({ ...refreshedUser, token: createdToken })

    return {
      ...returnedUser,
      email: emailFromApi,
      isSubAccount: isSubAccountFromDb,
      token: createdToken
    }
  }

  async signOut (args, params) {
    const { auth } = { ...args }
    const {
      email,
      password,
      isSubAccount,
      token
    } = { ...auth }
    const { active = false } = { ...params }

    const user = await this.verifyUser(
      {
        auth: {
          email,
          password,
          isSubAccount,
          token
        }
      }
    )
    const { _id, email: emailFromDb } = { ...user }

    const res = await this.dao.updateCollBy(
      this.TABLES_NAMES.USERS,
      { _id, email: emailFromDb },
      { active: serializeVal(active) }
    )

    if (res && res.changes < 1) {
      throw new AuthError()
    }

    this.removeUserSessionByToken(token)

    return true
  }

  async verifyUser (args, params) {
    const { auth } = { ...args }
    const {
      email,
      password: userPwd,
      isSubAccount = false,
      token
    } = { ...auth }
    const password = (
      userPwd &&
      typeof userPwd === 'string'
    )
      ? userPwd
      : this.crypto.getSecretKey()
    const {
      projection,
      isFilledSubUsers,
      isDecryptedApiKeys,
      isReturnedPassword,
      isSubUser = false,
      isNotInTrans,
      isAppliedProjectionToSubUser
    } = { ...params }

    if (
      email &&
      typeof email === 'string' &&
      password &&
      typeof password === 'string'
    ) {
      const pwdParam = isDecryptedApiKeys
        ? { password }
        : {}
      const _user = await this.getUser(
        { email, isSubAccount, isSubUser },
        {
          isNotInTrans,
          isFilledSubUsers,
          ...pwdParam
        }
      )
      const { passwordHash } = { ..._user }

      await this.crypto.verifyPassword(
        password,
        passwordHash
      )

      const user = {
        ..._user,
        password: isReturnedPassword ? password : null
      }

      return this.pickProps(
        user,
        projection,
        isAppliedProjectionToSubUser
      )
    }
    if (
      token &&
      typeof token === 'string'
    ) {
      const session = this.getUserSessionByToken(
        token,
        isReturnedPassword
      )
      const { apiKey, apiSecret } = { ...session }

      if (
        !apiKey ||
        typeof apiKey !== 'string' ||
        !apiSecret ||
        typeof apiSecret !== 'string'
      ) {
        throw new AuthError()
      }

      return this.pickProps(
        session,
        projection,
        isAppliedProjectionToSubUser
      )
    }

    throw new AuthError()
  }

  async verifyRequestUser (
    args,
    opts
  ) {
    const { isForcedVerification } = { ...opts }
    const { auth } = { ...args }
    const { _id } = { ...auth }
    const params = {
      isFilledSubUsers: true,
      isDecryptedApiKeys: true,
      isReturnedPassword: true
    }

    const user = (
      isForcedVerification ||
      !Number.isInteger(_id)
    )
      ? await this.verifyUser(args, params)
      : auth

    if (
      args &&
      typeof args === 'object'
    ) {
      args.auth = user
    }

    return user
  }

  async getUser (filter, params) {
    const {
      isFilledSubUsers,
      projection,
      password,
      isAppliedProjectionToSubUser
    } = { ...params }

    const _user = await this.dao.getUser(filter, params)
    const user = this.pickProps(
      _user,
      projection,
      isAppliedProjectionToSubUser
    )

    if (
      !password ||
      typeof password !== 'string'
    ) {
      return user
    }

    const decryptedUser = await this
      .decryptApiKeys(password, user)

    if (!isFilledSubUsers) {
      return decryptedUser
    }

    const { subUsers } = { ...decryptedUser }

    const decryptedSubUsers = await this
      .decryptApiKeys(password, subUsers)

    return {
      ...decryptedUser,
      subUsers: decryptedSubUsers
    }
  }

  async getUsers (filter, params) {
    const {
      isFilledSubUsers,
      password,
      emailPasswordsMap,
      projection,
      isAppliedProjectionToSubUser
    } = { ...params }
    const _emailPasswordsMap = Array.isArray(emailPasswordsMap)
      ? emailPasswordsMap
      : [emailPasswordsMap]
    const filteredEmailPwdsMap = _emailPasswordsMap
      .filter((emailPwd) => {
        const { password, email } = { ...emailPwd }

        return (
          password &&
          typeof password === 'string' &&
          email &&
          typeof email === 'string'
        )
      })

    const _users = await this.dao.getUsers(filter, params)
    const users = this.pickProps(
      _users,
      projection,
      isAppliedProjectionToSubUser
    )

    if (
      !password ||
      typeof password !== 'string'
    ) {
      return users
    }

    const decryptedUsers = await this
      .decryptApiKeys(password, users)

    if (!isFilledSubUsers) {
      return decryptedUsers
    }

    const promises = decryptedUsers.map((user) => {
      const { subUsers, email } = { ...user }
      const { password } = filteredEmailPwdsMap
        .find(({ email: pwdEmail }) => pwdEmail === email)

      return this.decryptApiKeys(password, subUsers)
    })
    const decryptedSubUsers = await Promise.all(promises)

    return decryptedUsers.map((user, i) => {
      return {
        ...user,
        subUsers: decryptedSubUsers[i]
      }
    })
  }

  async createUser (data, params) {
    const {
      email,
      isSubAccount = false,
      isSubUser = false
    } = { ...data }
    const { isNotInTrans } = { ...params }

    await this.dao.insertElemToDb(
      this.TABLES_NAMES.USERS,
      data
    )
    const user = await this.getUser(
      { email, isSubAccount, isSubUser },
      { isNotInTrans }
    )

    if (
      !user ||
      typeof user !== 'object' ||
      !Number.isInteger(user._id)
    ) {
      throw new AuthError()
    }

    return user
  }

  async removeUser (args) {
    const { auth } = { ...args }
    const {
      email,
      password,
      isSubAccount,
      token
    } = { ...auth }

    const {
      _id,
      email: emailFromDb
    } = await this.verifyUser(
      {
        auth: {
          email,
          password,
          isSubAccount,
          token
        }
      }
    )

    await this.dao.executeQueriesInTrans(async () => {
      const res = await this.dao.removeElemsFromDb(
        this.TABLES_NAMES.USERS,
        null,
        { _id, email: emailFromDb }
      )

      if (res && res.changes < 1) {
        throw new UserRemovingError()
      }

      this.removeUserSessionByToken(token)
    })

    return true
  }

  setUserSession (user) {
    const { token } = { ...user }

    this.userSessions.set(token, { ...user })
  }

  getUserSessionByToken (token, isReturnedPassword) {
    const session = this.userSessions.get(token)

    return this.pickSessionProps(session, isReturnedPassword)
  }

  getUserSessionByEmail (args, isReturnedPassword) {
    const {
      email,
      isSubAccount = false
    } = { ...args }
    const keyVal = [...this.userSessions].find(([, session]) => {
      return (
        email === session.email &&
        isSubAccount === session.isSubAccount
      )
    })
    const session = Array.isArray(keyVal) ? keyVal[1] : {}

    return this.pickSessionProps(session, isReturnedPassword)
  }

  getUserSessions () {
    const sessionsMap = [...this.userSessions]
      .map(([token, session]) => [
        token,
        this.pickSessionProps(session)
      ])

    return new Map(sessionsMap)
  }

  removeUserSessionByToken (token) {
    return this.userSessions.delete(token)
  }

  async decryptApiKeys (password, users) {
    const isArray = Array.isArray(users)
    const _users = isArray ? users : [users]

    const promises = _users.reduce((accum, user) => {
      const { apiKey, apiSecret } = { ...user }

      return [
        ...accum,
        this.crypto.decrypt(apiKey, password),
        this.crypto.decrypt(apiSecret, password)
      ]
    }, [])
    const decryptedApiKeys = await Promise.all(promises)

    const res = _users.map((user, i) => {
      const apiKey = decryptedApiKeys[i * 2]
      const apiSecret = decryptedApiKeys[i * 2 + 1]

      return {
        ...user,
        apiKey,
        apiSecret
      }
    })

    return isArray ? res : res[0]
  }

  generateSubUserName (user, isSubAccount, isSubUser) {
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

  pickProps (data, props, isAppliedProjectionToSubUser) {
    if (
      !Array.isArray(props) ||
      props.length === 0
    ) {
      return data
    }

    const isArray = Array.isArray(data)
    const dataArr = isArray ? data : [data]

    const res = dataArr.map((item) => {
      if (!item || typeof item !== 'object') {
        return item
      }

      if (
        !isAppliedProjectionToSubUser ||
        !Array.isArray(item.subUsers) ||
        item.subUsers.length === 0
      ) {
        return pick(item, props)
      }

      const subUsers = item.subUsers.map((subUser) => {
        if (!subUser || typeof subUser !== 'object') {
          return subUser
        }

        return pick(subUser, props)
      })

      return pick({ ...item, subUsers }, props)
    })

    return isArray ? res : res[0]
  }

  pickSessionProps (session, isReturnedPassword) {
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
    const subUsers = this.pickProps(reqSubUsers, allowedProps)
    const data = { ...session, subUsers }

    return this.pickProps(data, allowedProps)
  }
}

decorate(injectable(), Authenticator)
decorate(inject(TYPES.DAO), Authenticator, 0)
decorate(inject(TYPES.TABLES_NAMES), Authenticator, 1)
decorate(inject(TYPES.RService), Authenticator, 2)
decorate(inject(TYPES.Crypto), Authenticator, 3)

module.exports = Authenticator
