'use strict'

const { v4: uuidv4 } = require('uuid')
const { pick, isNil } = require('lib-js-util-base')
const {
  AuthError,
  ArgsParamsError
} = require('bfx-report/workers/loc.api/errors')
const {
  isENetError
} = require('bfx-report/workers/loc.api/helpers')

const { serializeVal } = require('../dao/helpers')
const {
  isSubAccountApiKeys
} = require('../../helpers')
const {
  UserUpdatingError,
  UserRemovingError,
  UserRemovingDuringSyncError,
  UserWasPreviouslyStoredInDbError,
  AuthTokenGenerationError,
  AuthTokenTTLSettingError
} = require('../../errors')
const {
  generateSubUserName,
  pickProps,
  pickSessionProps
} = require('./helpers')
const Progress = require('../progress')

const { decorateInjectable } = require('../../di/utils')

const depsTypes = (TYPES) => [
  TYPES.DAO,
  TYPES.TABLES_NAMES,
  TYPES.RService,
  TYPES.GetDataFromApi,
  TYPES.Crypto,
  TYPES.SyncFactory,
  TYPES.WSEventEmitterFactory,
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
    wsEventEmitterFactory,
    logger
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.rService = rService
    this.getDataFromApi = getDataFromApi
    this.crypto = crypto
    this.syncFactory = syncFactory
    this.wsEventEmitterFactory = wsEventEmitterFactory
    this.logger = logger

    /**
     * It may only work for one grenache worker instance
     */
    this.userSessions = new Map()
    this.userTokenMapByEmail = new Map()

    this.minAuthTokenTTLSec = 24 * 60 * 60
    this.maxAuthTokenTTLSec = 7 * 24 * 60 * 60
    this.authTokenTTLSec = this.minAuthTokenTTLSec
    /*
     * Here need to have an interval between the generation
     * of a new authToken and the invalidation of the old one
     * so that the current running processes are finished
     * successfully if the token was cached in memory
     */
    this.authTokenRefreshIntervalSec = 10 * 60
    this.authTokenInvalidateIntervalsSec = 10 * 60
  }

  async signUp (args, opts) {
    const { auth, params } = args ?? {}
    const {
      apiKey,
      apiSecret,
      password: userPwd,
      isNotProtected = false
    } = auth ?? {}
    const {
      authTokenTTLSec = null,
      localUsername = null
    } = params ?? {}
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

    const hasNotCredentials = this._hasNotCredentials({
      authToken: auth?.authToken,
      apiKey,
      apiSecret,
      password,
      isSubAccount,
      isSubUser
    })

    if (
      hasNotCredentials ||
      (
        !isDisabledApiKeysVerification &&
        isSubAccountApiKeys({ apiKey, apiSecret })
      )
    ) {
      throw new AuthError()
    }
    if (this._isAuthTokenTTLInvalid(authTokenTTLSec)) {
      throw new AuthTokenTTLSettingError()
    }
    if (
      (localUsername && !isSubAccount) ||
      this._isLocalUsernameInvalid(localUsername)
    ) {
      throw new ArgsParamsError()
    }
    const authToken = auth?.authToken
      ? await this.generateAuthToken({
        auth: { authToken: auth?.authToken, authTokenTTLSec }
      })
      : auth?.authToken

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

    const {
      passwordHash,
      encryptedAuthToken,
      encryptedApiKey,
      encryptedApiSecret
    } = await this._getEncryptedCredentials({
      authToken,
      apiKey,
      apiSecret,
      password
    })

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
        isNotProtected: serializeVal(isNotProtected),
        shouldNotSyncOnStartupAfterUpdate: 0,
        isSyncOnStartupRequired: 0,
        authTokenTTLSec,
        localUsername
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
      password: userPwd,
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
          password: userPwd,
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
      apiSecret,
      password,
      shouldNotSyncOnStartupAfterUpdate,
      isSyncOnStartupRequired,
      authTokenTTLSec,
      localUsername
    } = user ?? {}

    let newAuthToken = null

    try {
      newAuthToken = authToken
        ? await this.generateAuthToken({
          auth: {
            ...user,
            authToken: args?.auth?.authToken ?? user?.authToken
          }
        })
        : null
    } catch (err) {
      await this.wsEventEmitterFactory()
        .emitBfxUnamePwdAuthRequiredToOne(
          { isAuthTokenGenError: true },
          user
        )

      throw err
    }

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
      this.userSessions.get(createdToken)
        .authToken = newAuthToken
    }
    if (authToken) {
      this.setupAuthTokenInvalidateInterval({
        token: createdToken,
        authToken
      })
    }

    return {
      ...returnedUser,
      email: emailFromApi,
      isSubAccount: isSubAccountFromDb,
      token: createdToken,
      shouldNotSyncOnStartupAfterUpdate,
      isSyncOnStartupRequired,
      authTokenTTLSec,
      localUsername
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
      authToken,
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

    const hasNotCredentials = this._hasNotCredentials({
      authToken,
      apiKey,
      apiSecret,
      password,
      isSubAccount,
      isSubUser
    })

    if (hasNotCredentials) {
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

    const {
      passwordHash,
      encryptedAuthToken,
      encryptedApiKey,
      encryptedApiSecret
    } = await this._getEncryptedCredentials({
      authToken,
      apiKey,
      apiSecret,
      password
    })

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
      authToken,
      apiKey,
      apiSecret,
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
        isNotProtected,
        authToken: encryptedAuthToken,
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret
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
    const remapedUsers = _users.map((user) => {
      if (
        !user ||
        typeof user !== 'object'
      ) {
        return user
      }

      user.isRestrictedToBeAddedToSubAccount = (
        !!user.authToken ||
        !!user.isSubAccount
      )
      user.isApiKeysAuth = !!(
        user.apiKey &&
        typeof user.apiKey === 'string' &&
        user.apiSecret &&
        typeof user.apiSecret === 'string'
      )

      return user
    })
    const users = pickProps(
      remapedUsers,
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
    const { isSyncInProgress } = await Progress
      .getNonEstimatedProgress(this.dao, this.TABLES_NAMES)

    if (isSyncInProgress) {
      throw new UserRemovingDuringSyncError()
    }

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

  async updateUser (args, opts) {
    const {
      email,
      password: userPwd,
      isSubAccount,
      token
    } = args?.auth ?? {}
    const freshUserData = pick(
      args?.params,
      [
        'shouldNotSyncOnStartupAfterUpdate',
        'isSyncOnStartupRequired',
        'authTokenTTLSec',
        'localUsername'
      ]
    )
    const {
      isNotInTrans = false,
      doNotQueueQuery = false,
      withWorkerThreads = false
    } = opts ?? {}

    const {
      _id,
      email: emailFromDb,
      isSubAccount: isSubAccountFromDb
    } = await this.verifyUser(
      {
        auth: {
          email,
          password: userPwd,
          isSubAccount,
          token
        }
      },
      {
        isNotInTrans,
        withWorkerThreads,
        doNotQueueQuery
      }
    )

    if (Object.keys(freshUserData).length === 0) {
      return false
    }
    if (this._isAuthTokenTTLInvalid(freshUserData?.authTokenTTLSec)) {
      throw new AuthTokenTTLSettingError()
    }
    if (
      (freshUserData?.localUsername && !isSubAccountFromDb) ||
      this._isLocalUsernameInvalid(freshUserData?.localUsername)
    ) {
      throw new ArgsParamsError()
    }

    const res = await this.dao.updateCollBy(
      this.TABLES_NAMES.USERS,
      { _id, email: emailFromDb },
      freshUserData,
      { withWorkerThreads, doNotQueueQuery }
    )

    if (res && res.changes < 1) {
      throw new UserUpdatingError()
    }

    const existedToken = (
      token &&
      typeof token === 'string'
    )
      ? token
      : this.getUserSessionByEmail({ email, isSubAccount })?.token

    if (
      !existedToken ||
      typeof existedToken !== 'string'
    ) {
      return true
    }

    const session = this.userSessions.get(existedToken)
    Object.assign(session, freshUserData)

    return true
  }

  setUserSession (user) {
    const {
      token,
      authToken
    } = user ?? {}
    const tokenKey = this._getTokenKeyByEmailField(user)

    const authTokenRefreshInterval = authToken
      ? this.setupAuthTokenRefreshInterval(user)
      : null

    this.userSessions.set(
      token, {
        ...user,
        authTokenFn: () => {
          return this.userSessions.get(token)?.authToken
        },
        authTokenRefreshInterval,
        authTokenInvalidateIntervals: new Map()
      }
    )
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

    const session = this.userSessions.get(_token) ?? {}
    const {
      authTokenRefreshInterval,
      authTokenInvalidateIntervals = new Map()
    } = session

    clearInterval(authTokenRefreshInterval)

    for (const [authToken, authTokenInvalidateInterval] of authTokenInvalidateIntervals) {
      clearInterval(authTokenInvalidateInterval)

      // Try to invalidate auth token without awaiting
      this.invalidateAuthToken({
        auth: session,
        params: { authToken }
      }).then(() => {}, (err) => {
        this.logger.debug(err)
      })
    }

    return this.userSessions.delete(_token)
  }

  async decryptApiKeys (password, users) {
    const isArray = Array.isArray(users)
    const _users = isArray ? users : [users]

    const promises = _users.reduce((accum, user) => {
      const { authToken, apiKey, apiSecret } = user ?? {}

      const decryptedPromises = [
        null,
        null,
        null
      ]

      if (authToken) {
        decryptedPromises[0] = this.crypto
          .decrypt(authToken, password)
      }
      if (
        apiKey &&
        typeof apiKey === 'string' &&
        apiSecret &&
        typeof apiSecret === 'string'
      ) {
        decryptedPromises[1] = this.crypto
          .decrypt(apiKey, password)
        decryptedPromises[2] = this.crypto
          .decrypt(apiSecret, password)
      }

      accum.push(...decryptedPromises)

      return accum
    }, [])
    const decryptedApiKeys = await Promise.all(promises)

    const res = _users.map((user, i) => {
      const authToken = decryptedApiKeys[i * 3]
      const apiKey = decryptedApiKeys[i * 3 + 1]
      const apiSecret = decryptedApiKeys[i * 3 + 2]

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
    try {
      const auth = pickSessionProps(args?.auth)
      const opts = {
        ttl: args?.auth?.authTokenTTLSec ?? this.authTokenTTLSec,
        writePermission: false
      }

      const res = await this.getDataFromApi({
        getData: (s, args) => this.rService._generateToken(args, opts),
        args: { ...args, auth },
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
    } catch (err) {
      throw new AuthTokenGenerationError({
        data: {
          isAuthTokenGenerationError: true,
          rootMessage: err.toString()
        }
      })
    }
  }

  async invalidateAuthToken (args) {
    const auth = pickSessionProps(args?.auth)

    const res = await this.getDataFromApi({
      getData: (s, args) => this.rService._invalidateAuthToken(args),
      args: { ...args, auth },
      callerName: 'AUTHENTICATOR',
      eNetErrorAttemptsTimeframeMin: 10 / 60,
      eNetErrorAttemptsTimeoutMs: 1000,
      shouldNotInterrupt: true
    })

    return res
  }

  setupAuthTokenInvalidateInterval (user) {
    const {
      token,
      authToken
    } = user ?? {}
    const userSession = this.userSessions.get(token)

    if (!(userSession.authTokenInvalidateIntervals instanceof Map)) {
      userSession.authTokenInvalidateIntervals = new Map()
    }

    const { authTokenInvalidateIntervals } = userSession
    let count = 0

    const authTokenInvalidateInterval = setInterval(async () => {
      const session = this.userSessions.get(token)

      try {
        count += 1

        await this.invalidateAuthToken({
          auth: session,
          params: { authToken }
        })

        clearInterval(authTokenInvalidateInterval)
        session.authTokenInvalidateIntervals?.delete(authToken)
      } catch (err) {
        if (count >= 3) {
          clearInterval(authTokenInvalidateInterval)
          session.authTokenInvalidateIntervals?.delete(authToken)
        }

        this.logger.debug(err)
      }
    }, (this.authTokenInvalidateIntervalsSec * 1000)).unref()

    authTokenInvalidateIntervals.set(authToken, authTokenInvalidateInterval)
  }

  setupAuthTokenRefreshInterval (user) {
    const {
      token
    } = user ?? {}
    const authTokenRefreshInterval = this.userSessions.get(token)
      ?.authTokenRefreshInterval

    clearInterval(authTokenRefreshInterval)

    const newAuthTokenRefreshInterval = setInterval(async () => {
      try {
        const session = this.userSessions.get(token)
        const prevAuthToken = session?.authToken
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
          throw new AuthTokenGenerationError({
            data: { isAuthTokenGenerationError: true }
          })
        }

        session.authToken = newAuthToken

        if (!prevAuthToken) {
          return
        }

        this.setupAuthTokenInvalidateInterval({
          token,
          authToken: prevAuthToken
        })
      } catch (err) {
        this.logger.debug(err)

        await this.wsEventEmitterFactory()
          .emitBfxUnamePwdAuthRequiredToOne(
            { isAuthTokenGenError: true },
            user
          )
      }
    }, (this.authTokenRefreshIntervalSec * 1000)).unref()

    return newAuthTokenRefreshInterval
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

  async _getEncryptedCredentials (auth) {
    const {
      authToken,
      apiKey,
      apiSecret,
      password
    } = auth ?? {}

    const encryptPromises = [
      this.crypto.hashPassword(password),
      null,
      null,
      null
    ]

    if (authToken) {
      encryptPromises[1] = this.crypto
        .encrypt(authToken, password)
    }
    if (
      apiKey &&
      typeof apiKey === 'string' &&
      apiSecret &&
      typeof apiSecret === 'string'
    ) {
      encryptPromises[2] = this.crypto
        .encrypt(apiKey, password)
      encryptPromises[3] = this.crypto
        .encrypt(apiSecret, password)
    }

    const [
      passwordHash,
      encryptedAuthToken,
      encryptedApiKey,
      encryptedApiSecret
    ] = await Promise.all(encryptPromises)

    return {
      passwordHash,
      encryptedAuthToken,
      encryptedApiKey,
      encryptedApiSecret
    }
  }

  _hasNotCredentials (args) {
    const {
      authToken,
      apiKey,
      apiSecret,
      password,
      isSubAccount,
      isSubUser
    } = args ?? {}

    if (
      (
        !apiKey ||
        typeof apiKey !== 'string' ||
        !apiSecret ||
        typeof apiSecret !== 'string'
      ) &&
      !authToken
    ) {
      return true
    }
    if (
      !password ||
      typeof password !== 'string'
    ) {
      return true
    }
    if (
      isSubAccount &&
      isSubUser
    ) {
      return true
    }

    return false
  }

  _isAuthTokenTTLInvalid (authTokenTTLSec) {
    return (
      !isNil(authTokenTTLSec) &&
      (
        !Number.isInteger(authTokenTTLSec) ||
        authTokenTTLSec < this.minAuthTokenTTLSec ||
        authTokenTTLSec > this.maxAuthTokenTTLSec
      )
    )
  }

  _isLocalUsernameInvalid (localUsername) {
    return (
      !isNil(localUsername) &&
      (
        !localUsername ||
        typeof localUsername !== 'string'
      )
    )
  }
}

decorateInjectable(Authenticator, depsTypes)

module.exports = Authenticator
