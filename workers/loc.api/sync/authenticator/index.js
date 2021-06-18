'use strict'

const { v4: uuidv4 } = require('uuid')
const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const { serializeVal } = require('../dao/helpers')
const {
  isSubAccountApiKeys,
  isEnotfoundError,
  isEaiAgainError
} = require('../../helpers')
const {
  UserRemovingError,
  UserWasPreviouslyStoredInDbError
} = require('../../errors')
const {
  generateSubUserName,
  pickProps,
  pickSessionProps
} = require('./helpers')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.TABLES_NAMES,
  TYPES.RService,
  TYPES.Crypto,
  TYPES.SyncFactory
]
class Authenticator {
  constructor (
    dao,
    TABLES_NAMES,
    rService,
    crypto,
    syncFactory
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.rService = rService
    this.crypto = crypto
    this.syncFactory = syncFactory

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
      isNotProtected = false
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
      masterUserId,
      withoutWorkerThreads = false
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

    if (
      !email ||
      typeof email !== 'string'
    ) {
      throw new AuthError()
    }

    const username = generateSubUserName(
      { masterUserId, username: uName },
      isSubAccount,
      isSubUser
    )

    const userFromDb = isDisabledApiKeysVerification
      ? null
      : await this.getUser(
        { email, username, isSubAccount, isSubUser },
        { isNotInTrans, withoutWorkerThreads }
      )

    if (
      userFromDb &&
      typeof userFromDb === 'object' &&
      Number.isInteger(userFromDb._id)
    ) {
      throw new UserWasPreviouslyStoredInDbError()
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
        passwordHash,
        isNotProtected: serializeVal(isNotProtected)
      },
      { isNotInTrans, withoutWorkerThreads }
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
      isReturnedUser,
      isNotInTrans,
      isNotSetSession,
      withoutWorkerThreads
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
        isReturnedPassword: true,
        isNotInTrans,
        withoutWorkerThreads
      }
    )
    const {
      _id,
      email: emailFromDb,
      isSubAccount: isSubAccountFromDb,
      apiKey,
      apiSecret
    } = { ...user }

    let userData = user

    try {
      userData = await this.rService._checkAuthInApi({
        auth: { apiKey, apiSecret }
      })
    } catch (err) {
      if (
        !isEnotfoundError(err) &&
        !isEaiAgainError(err)
      ) {
        throw err
      }
    }

    const {
      id,
      timezone,
      username: uName,
      email: emailFromApi
    } = { ...userData }
    const username = generateSubUserName(
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
      },
      { withoutWorkerThreads }
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

    if (!isNotSetSession) {
      this.setUserSession({ ...refreshedUser, token: createdToken })
    }

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

    const isSchedulerEnabled = await this.rService
      .isSchedulerEnabled()
    await this.dao.updateRecordOf(
      this.TABLES_NAMES.SCHEDULER,
      { isEnable: false }
    )
    await this.syncFactory().stop()

    const res = await this.dao.updateCollBy(
      this.TABLES_NAMES.USERS,
      { _id, email: emailFromDb },
      { active: serializeVal(active) }
    )

    if (res && res.changes < 1) {
      throw new AuthError()
    }

    this.removeUserSessionByToken(token)

    if (isSchedulerEnabled) {
      await this.dao.updateRecordOf(
        this.TABLES_NAMES.SCHEDULER,
        { isEnable: true }
      )
    }

    return true
  }

  async recoverPassword (args, params) {
    const { auth } = { ...args }
    const {
      apiKey,
      apiSecret,
      newPassword,
      isSubAccount = false,
      isNotProtected = false
    } = { ...auth }
    const password = isNotProtected
      ? this.crypto.getSecretKey()
      : newPassword
    const {
      active = true,
      isDataFromDb = true,
      isReturnedUser = false,
      isNotInTrans = false,
      isSubUser = false,
      withoutWorkerThreads = false
    } = { ...params }

    if (
      !apiKey ||
      typeof apiKey !== 'string' ||
      !apiSecret ||
      typeof apiSecret !== 'string' ||
      !password ||
      typeof password !== 'string' ||
      (isSubAccount && isSubUser)
    ) {
      throw new AuthError()
    }

    const {
      id,
      email,
      timezone,
      username: uName
    } = await this.rService._checkAuthInApi(args)

    if (
      !email ||
      typeof email !== 'string'
    ) {
      throw new AuthError()
    }

    const userFromDb = await this.getUser(
      {
        email,
        isSubAccount,
        isSubUser
      },
      {
        isFilledSubUsers: true,
        isNotInTrans,
        withoutWorkerThreads
      }
    )

    if (
      !userFromDb ||
      typeof userFromDb !== 'object' ||
      !Number.isInteger(userFromDb._id)
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

    const username = generateSubUserName(
      { username: uName },
      isSubAccount,
      isSubUser
    )
    const freshUserData = {
      id,
      timezone,
      username,
      email,
      apiKey: encryptedApiKey,
      apiSecret: encryptedApiSecret,
      passwordHash,
      active: active === null
        ? userFromDb.active
        : active,
      isDataFromDb: isDataFromDb === null
        ? userFromDb.isDataFromDb
        : isDataFromDb
    }

    const res = await this.dao.updateCollBy(
      this.TABLES_NAMES.USERS,
      { _id: userFromDb._id, email },
      {
        ...freshUserData,
        active: serializeVal(freshUserData.active),
        isDataFromDb: serializeVal(freshUserData.isDataFromDb),
        isNotProtected: serializeVal(isNotProtected)
      },
      { withoutWorkerThreads }
    )

    if (res && res.changes < 1) {
      throw new AuthError()
    }

    const refreshedUser = {
      ...userFromDb,
      ...freshUserData
    }
    const returnedUser = isReturnedUser
      ? refreshedUser
      : {}

    if (isSubUser) {
      return returnedUser
    }

    const existedToken = this.getUserSessionByEmail(
      { email, isSubAccount }
    ).token
    const createdToken = (
      existedToken &&
      typeof existedToken === 'string'
    )
      ? existedToken
      : uuidv4()

    this.setUserSession({ ...refreshedUser, token: createdToken })

    return {
      ...returnedUser,
      email,
      isSubAccount,
      token: createdToken
    }
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
      isAppliedProjectionToSubUser,
      subUsersProjection,
      withoutWorkerThreads
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
          withoutWorkerThreads,
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

      return pickProps(
        user,
        projection,
        {
          isAppliedProjectionToSubUser,
          subUsersProjection
        }
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

      return pickProps(
        session,
        projection,
        {
          isAppliedProjectionToSubUser,
          subUsersProjection
        }
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
      isAppliedProjectionToSubUser,
      subUsersProjection
    } = { ...params }

    const _user = await this.dao.getUser(filter, params)
    const user = pickProps(
      _user,
      projection,
      {
        isAppliedProjectionToSubUser,
        subUsersProjection
      }
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
      isAppliedProjectionToSubUser,
      subUsersProjection
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
    const users = pickProps(
      _users,
      projection,
      {
        isAppliedProjectionToSubUser,
        subUsersProjection
      }
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
    const {
      isNotInTrans,
      withoutWorkerThreads
    } = { ...params }

    await this.dao.insertElemToDb(
      this.TABLES_NAMES.USERS,
      data,
      { withoutWorkerThreads }
    )
    const user = await this.getUser(
      { email, isSubAccount, isSubUser },
      { isNotInTrans, withoutWorkerThreads }
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

    const res = await this.dao.removeElemsFromDb(
      this.TABLES_NAMES.USERS,
      null,
      { _id, email: emailFromDb }
    )

    if (res && res.changes < 1) {
      throw new UserRemovingError()
    }

    this.removeUserSessionByToken(token)

    return true
  }

  setUserSession (user) {
    const { token } = { ...user }

    this.userSessions.set(token, { ...user })
  }

  getUserSessionByToken (token, isReturnedPassword) {
    const session = this.userSessions.get(token)

    return pickSessionProps(session, isReturnedPassword)
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

    return pickSessionProps(session, isReturnedPassword)
  }

  getUserSessions () {
    const sessionsMap = [...this.userSessions]
      .map(([token, session]) => [
        token,
        pickSessionProps(session)
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
}

decorateInjectable(Authenticator, depsTypes)

module.exports = Authenticator
