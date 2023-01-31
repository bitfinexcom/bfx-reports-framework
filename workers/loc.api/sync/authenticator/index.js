'use strict'

const { v4: uuidv4 } = require('uuid')
const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')
const {
  isENetError
} = require('bfx-report/workers/loc.api/helpers')

const { serializeVal } = require('../dao/helpers')
const {
  isSubAccountApiKeys
} = require('../../helpers')
const {
  UserRemovingError,
  UserWasPreviouslyStoredInDbError,
  AuthTokenGenerationError
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
  TYPES.GetDataFromApi,
  TYPES.Crypto,
  TYPES.SyncFactory,
  TYPES.WSEventEmitter,
  TYPES.Logger
]
class Authenticator {
  constructor (
    dao,
    TABLES_NAMES,
    rService,
    getDataFromApi,
    crypto,
    syncFactory,
    wsEventEmitter,
    logger
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.rService = rService
    this.getDataFromApi = getDataFromApi
    this.crypto = crypto
    this.syncFactory = syncFactory
    this.wsEventEmitter = wsEventEmitter
    this.logger = logger

    /**
     * It may only work for one grenache worker instance
     */
    this.userSessions = new Map()
    this.userTokenMapByEmail = new Map()
  }

  async signUp (args, opts) {
    const { auth } = args ?? {}
    const {
      authToken,
      apiKey,
      apiSecret,
      password: userPwd,
      isNotProtected = false
    } = auth ?? {}
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
      doNotQueueQuery,
      masterUserId,
      withWorkerThreads = false
    } = opts ?? {}

    if (
      (
        (
          !apiKey ||
          typeof apiKey !== 'string' ||
          !apiSecret ||
          typeof apiSecret !== 'string'
        ) &&
        !authToken
      ) ||
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
      : await this.getDataFromApi({
        getData: (s, args) => this.rService._checkAuthInApi(args),
        args,
        callerName: 'AUTHENTICATOR',
        eNetErrorAttemptsTimeframeMin: 10 / 60,
        eNetErrorAttemptsTimeoutMs: 1000,
        shouldNotInterrupt: true
      })

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
        { isNotInTrans, withWorkerThreads, doNotQueueQuery }
      )

    if (
      userFromDb &&
      typeof userFromDb === 'object' &&
      Number.isInteger(userFromDb._id)
    ) {
      throw new UserWasPreviouslyStoredInDbError()
    }

    const [
      encryptedAuthToken,
      encryptedApiKey,
      encryptedApiSecret,
      passwordHash
    ] = await Promise.all([
      this.crypto.encrypt(authToken, password),
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
        authToken: encryptedAuthToken,
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        active: serializeVal(active),
        isDataFromDb: serializeVal(isDataFromDb),
        isSubAccount: serializeVal(isSubAccount),
        isSubUser: serializeVal(isSubUser),
        passwordHash,
        isNotProtected: serializeVal(isNotProtected)
      },
      { isNotInTrans, withWorkerThreads, doNotQueueQuery }
    )

    const token = uuidv4()
    const fullUserData = {
      ...user,
      subUsers: [],
      authToken,
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

  async signIn (args, opts) {
    const {
      email,
      password,
      isSubAccount,
      token
    } = args?.auth ?? {}
    const {
      active = true,
      isDataFromDb = true,
      isReturnedUser,
      isNotInTrans,
      doNotQueueQuery,
      isNotSetSession,
      withWorkerThreads = false
    } = opts ?? {}

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
        withWorkerThreads,
        doNotQueueQuery
      }
    )
    const {
      _id,
      email: emailFromDb,
      isSubAccount: isSubAccountFromDb,
      authToken,
      apiKey,
      apiSecret
    } = user ?? {}

    const newAuthToken = authToken
      ? await this.generateAuthToken({
        auth: user
      })
      : null
    const encryptedAuthToken = authToken
      ? await this.crypto
        .encrypt(newAuthToken, password)
      : null

    let userData = user

    try {
      userData = await this.rService._checkAuthInApi({
        auth: { authToken: newAuthToken, apiKey, apiSecret }
      })
    } catch (err) {
      if (!isENetError(err)) {
        throw err
      }
    }

    const {
      id,
      timezone,
      username: uName,
      email: emailFromApi
    } = userData ?? {}
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
        : isDataFromDb,
      ...newAuthToken
        ? { authToken: newAuthToken }
        : null
    }
    const res = await this.dao.updateCollBy(
      this.TABLES_NAMES.USERS,
      { _id, email: emailFromDb },
      {
        ...freshUserData,
        ...encryptedAuthToken
          ? { authToken: encryptedAuthToken }
          : null
      },
      { withWorkerThreads, doNotQueueQuery }
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
      : this.getUserSessionByEmail({ email, isSubAccount })?.token
    const isTokenExisted = (
      existedToken &&
      typeof existedToken === 'string'
    )
    const createdToken = isTokenExisted
      ? existedToken
      : uuidv4()

    if (!isNotSetSession) {
      this.setUserSession({ ...refreshedUser, token: createdToken })
    }
    if (
      newAuthToken &&
      isTokenExisted &&
      isNotSetSession
    ) {
      this.userSessions.get(existedToken)
        .authToken = newAuthToken
    }

    return {
      ...returnedUser,
      email: emailFromApi,
      isSubAccount: isSubAccountFromDb,
      token: createdToken
    }
  }

  async signOut (args, opts) {
    const {
      email,
      password,
      isSubAccount,
      token
    } = args?.auth ?? {}
    const { active = false } = opts ?? {}

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
    const { _id, email: emailFromDb } = user ?? {}

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
      { active }
    )

    if (res && res.changes < 1) {
      throw new AuthError()
    }

    this.removeUserSession({
      email,
      isSubAccount,
      token
    })

    if (isSchedulerEnabled) {
      await this.dao.updateRecordOf(
        this.TABLES_NAMES.SCHEDULER,
        { isEnable: true }
      )
    }

    return true
  }

  async recoverPassword (args, opts) {
    const {
      apiKey,
      apiSecret,
      newPassword,
      isSubAccount = false,
      isNotProtected = false
    } = args?.auth ?? {}
    const password = isNotProtected
      ? this.crypto.getSecretKey()
      : newPassword
    const {
      active = true,
      isDataFromDb = true,
      isReturnedUser = false,
      isNotInTrans = false,
      isSubUser = false,
      withWorkerThreads = false,
      doNotQueueQuery
    } = opts ?? {}

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
    } = await this.getDataFromApi({
      getData: (s, args) => this.rService._checkAuthInApi(args),
      args,
      callerName: 'AUTHENTICATOR',
      eNetErrorAttemptsTimeframeMin: 10 / 60,
      eNetErrorAttemptsTimeoutMs: 1000,
      shouldNotInterrupt: true
    })

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
        withWorkerThreads,
        doNotQueueQuery
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
        active: freshUserData.active,
        isDataFromDb: freshUserData.isDataFromDb,
        isNotProtected
      },
      { withWorkerThreads, doNotQueueQuery }
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
    )?.token
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

  async verifyUser (args, opts) {
    const {
      email,
      password: userPwd,
      isSubAccount = false,
      token
    } = args?.auth ?? {}
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
      withWorkerThreads,
      doNotQueueQuery
    } = opts ?? {}

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
          withWorkerThreads,
          doNotQueueQuery,
          ...pwdParam
        }
      )
      const { passwordHash } = _user ?? {}

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
      const { authToken, apiKey, apiSecret } = session ?? {}

      if (
        (
          !apiKey ||
          typeof apiKey !== 'string' ||
          !apiSecret ||
          typeof apiSecret !== 'string'
        ) &&
        !authToken
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
    const { isForcedVerification } = opts ?? {}
    const { auth } = args ?? {}
    const { _id } = auth ?? {}
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

  async getUser (filter, opts) {
    const {
      isFilledSubUsers,
      projection,
      password,
      isAppliedProjectionToSubUser,
      subUsersProjection
    } = opts ?? {}

    const _user = await this.dao.getUser(filter, opts)
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

    const { subUsers } = decryptedUser ?? {}

    const decryptedSubUsers = await this
      .decryptApiKeys(password, subUsers)

    return {
      ...decryptedUser,
      subUsers: decryptedSubUsers
    }
  }

  async getUsers (filter, opts) {
    const {
      isFilledSubUsers,
      password,
      emailPasswordsMap,
      projection,
      isAppliedProjectionToSubUser,
      subUsersProjection
    } = opts ?? {}
    const _emailPasswordsMap = Array.isArray(emailPasswordsMap)
      ? emailPasswordsMap
      : [emailPasswordsMap]
    const filteredEmailPwdsMap = _emailPasswordsMap
      .filter((emailPwd) => {
        const { password, email } = emailPwd ?? {}

        return (
          password &&
          typeof password === 'string' &&
          email &&
          typeof email === 'string'
        )
      })

    const _users = await this.dao.getUsers(filter, opts)
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
      const { subUsers, email } = user ?? {}
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

  async createUser (data, opts) {
    const {
      isNotInTrans,
      withWorkerThreads,
      doNotQueueQuery
    } = opts ?? {}

    const { lastInsertRowid } = await this.dao.insertElemToDb(
      this.TABLES_NAMES.USERS,
      data,
      { withWorkerThreads, doNotQueueQuery }
    )

    if (!Number.isInteger(lastInsertRowid)) {
      throw new AuthError()
    }

    const user = await this.getUser(
      { _id: lastInsertRowid },
      { isNotInTrans, withWorkerThreads, doNotQueueQuery }
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
    const {
      email,
      password,
      isSubAccount,
      token
    } = args?.auth ?? {}

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

    this.removeUserSession({
      email,
      isSubAccount,
      token
    })

    return true
  }

  // TODO: Provide authToken for this method in all places
  setUserSession (user) {
    const {
      token,
      authToken
    } = user ?? {}
    const tokenKey = this._getTokenKeyByEmailField(user)

    const authTokenRefreshInterval = authToken
      ? this.setupAuthTokenRefreshInterval(user)
      : null

    this.userSessions.set(token, { ...user, authTokenRefreshInterval })
    this.userTokenMapByEmail.set(tokenKey, token)
  }

  getUserSessionByToken (token, isReturnedPassword) {
    const session = this.userSessions.get(token)

    return pickSessionProps(session, isReturnedPassword)
  }

  getUserSessionByEmail (user, isReturnedPassword) {
    const tokenKey = this._getTokenKeyByEmailField(user)
    const token = this.userTokenMapByEmail.get(tokenKey)
    const session = this.userSessions.get(token)

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

  removeUserSession (user) {
    const { token } = user ?? {}
    const tokenKey = this._getTokenKeyByEmailField(user)
    const _token = (
      token &&
      typeof token === 'string'
    )
      ? token
      : this.userTokenMapByEmail.get(tokenKey)

    this.userTokenMapByEmail.delete(tokenKey)

    const session = this.userSessions.get(_token)
    clearInterval(session?.authTokenRefreshInterval)

    return this.userSessions.delete(_token)
  }

  async decryptApiKeys (password, users) {
    const isArray = Array.isArray(users)
    const _users = isArray ? users : [users]

    const promises = _users.reduce((accum, user) => {
      const { authToken, apiKey, apiSecret } = user ?? {}

      return [
        ...accum,
        this.crypto.decrypt(authToken, password),
        this.crypto.decrypt(apiKey, password),
        this.crypto.decrypt(apiSecret, password)
      ]
    }, [])
    const decryptedApiKeys = await Promise.all(promises)

    const res = _users.map((user, i) => {
      const authToken = decryptedApiKeys[i * 2]
      const apiKey = decryptedApiKeys[i * 2 + 1]
      const apiSecret = decryptedApiKeys[i * 2 + 2]

      return {
        ...user,
        authToken,
        apiKey,
        apiSecret
      }
    })

    return isArray ? res : res[0]
  }

  async generateAuthToken (args) {
    const opts = {
      ttl: 604800,
      writePermission: true
    }

    const res = await this.getDataFromApi({
      getData: (s, args) => this.rService._generateToken(args, opts),
      args,
      callerName: 'AUTHENTICATOR',
      eNetErrorAttemptsTimeframeMin: 10 / 60,
      eNetErrorAttemptsTimeoutMs: 1000,
      shouldNotInterrupt: true
    })

    const [authToken] = Array.isArray(res) ? res : [null]

    if (!authToken) {
      throw new AuthTokenGenerationError()
    }

    return authToken
  }

  setupAuthTokenRefreshInterval (user) {
    const { token } = user ?? {}

    const authTokenRefreshInterval = setInterval(async () => {
      try {
        const session = this.userSessions.get(token)
        const password = (
          session?.password &&
          typeof session?.password === 'string'
        )
          ? session?.password
          : this.crypto.getSecretKey()

        const newAuthToken = await this.generateAuthToken({
          auth: session
        })
        const encryptedAuthToken = await this.crypto
          .encrypt(newAuthToken, password)

        const res = await this.dao.updateCollBy(
          this.TABLES_NAMES.USERS,
          { _id: session?._id, email: session?.email },
          { authToken: encryptedAuthToken }
        )

        if (res?.changes < 1) {
          throw new AuthTokenGenerationError()
        }

        session.authToken = newAuthToken
      } catch (err) {
        this.logger.debug(err)

        await this.wsEventEmitter
          .emitBfxUnamePwdAuthRequiredToOne(
            { isAuthTokenGenError: true },
            user
          )
      }
    }, (10 * 60 * 1000)).unref()

    return authTokenRefreshInterval
  }

  _getTokenKeyByEmailField (user) {
    const {
      email,
      isSubAccount
    } = user ?? {}
    const suffix = isSubAccount
      ? ':sub-account'
      : ''

    return `${email}${suffix}`
  }
}

decorateInjectable(Authenticator, depsTypes)

module.exports = Authenticator
