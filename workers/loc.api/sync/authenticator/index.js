'use strict'

const crypto = require('crypto')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')
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

const scrypt = promisify(crypto.scrypt)
const randomBytes = promisify(crypto.randomBytes)
const pbkdf2 = promisify(crypto.pbkdf2)
const jwtSign = promisify(jwt.sign)
const jwtVerify = promisify(jwt.verify)

class Authenticator {
  constructor (
    dao,
    TABLES_NAMES,
    CONF,
    rService
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
    this.CONF = CONF
    this.rService = rService

    const { secretKey } = { ...this.CONF }
    this.secretKey = secretKey && typeof secretKey === 'string'
      ? secretKey
      : 'secretKey'
    this.cryptoAlgorithm = 'aes-256-gcm'
    this.jwtAlgorithm = 'HS256'
    this.passwordAlgorithm = 'sha512'

    this.passRegEx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/

    /**
     * It may only work for one grenache worker instance
     */
    this.userSessions = new Map()
  }

  /**
   * It creates user entry
   *
   * @return { Promise<object> }
   * Return an object { jsonWebToken, email }
   * where jsonWebToken payload is
   * an object { _id, email, encryptedPassword }
   */
  async signUp (args, params) {
    const { auth } = { ...args }
    const { apiKey, apiSecret, password } = { ...auth }
    const {
      active = true,
      isDataFromDb = true
    } = { ...params }

    if (
      !apiKey ||
      typeof apiKey !== 'string' ||
      !apiSecret ||
      typeof apiSecret !== 'string' ||
      !password ||
      typeof password !== 'string' ||
      !this.isSecurePassword(password) ||
      isSubAccountApiKeys({ apiKey, apiSecret })
    ) {
      throw new AuthError()
    }

    const {
      email,
      timezone,
      username,
      id
    } = await this.rService._checkAuthInApi(args)
    const userFromDb = await this.getUser(
      { email },
      { isNotSubAccount: true }
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
      encryptedPassword,
      passwordHash
    ] = await Promise.all([
      this.encrypt(apiKey, password),
      this.encrypt(apiSecret, password),
      this.encrypt(password, this.secretKey),
      this.hashPassword(password)
    ])

    const { _id, isSubAccount } = await this.createUser({
      email,
      timezone,
      username,
      id,
      apiKey: encryptedApiKey,
      apiSecret: encryptedApiSecret,
      active: serializeVal(active),
      isDataFromDb: serializeVal(isDataFromDb),
      passwordHash
    })

    const payload = { _id, email, encryptedPassword }
    const jwt = await this.generateAuthJWT(payload)

    this.setUserSession({ _id, email, jwt })

    return { email, isSubAccount, jwt }
  }

  isSecurePassword (password) {
    return this.passRegEx.test(password)
  }

  async signIn (args, params) {
    const { auth } = { ...args }
    const {
      email,
      password,
      isSubAccount,
      jwt
    } = { ...auth }
    const {
      active = true,
      isDataFromDb = true
    } = { ...params }

    const user = await this.verifyUser(
      {
        auth: {
          email,
          password,
          isSubAccount,
          jwt
        }
      },
      {
        isDecryptedApiKeys: true,
        isReturnedPassword: true
      }
    )
    const {
      _id,
      email: emailFromDb,
      isSubAccount: isSubAccountFromDb,
      apiKey,
      apiSecret,
      password: decryptedPassword
    } = { ...user }

    const {
      id,
      timezone,
      username,
      email: emailFromApi
    } = await this.rService._checkAuthInApi({
      auth: { apiKey, apiSecret }
    })

    const res = await this.dao.updateCollBy(
      this.TABLES_NAMES.USERS,
      { _id, email: emailFromDb },
      {
        id,
        timezone,
        username,
        email: emailFromApi,
        active: serializeVal(active),
        isDataFromDb: serializeVal(isDataFromDb)
      }
    )

    if (res && res.changes < 1) {
      throw new AuthError()
    }

    const freshEmail = (
      (email && typeof email === 'string') ||
      emailFromApi !== emailFromDb
    )
      ? emailFromApi
      : null
    const payload = {
      _id,
      email: freshEmail,
      password: decryptedPassword,
      jwt
    }
    const resJWT = await this.generateAuthJWT(payload)

    this.setUserSession(
      { _id, email: emailFromApi, jwt: resJWT }
    )

    return {
      email: emailFromApi,
      isSubAccount: isSubAccountFromDb,
      jwt: resJWT
    }
  }

  async signOut (args, params) {
    const { auth } = { ...args }
    const {
      email,
      password,
      isSubAccount,
      jwt
    } = { ...auth }
    const { active = false } = { ...params }

    const user = await this.verifyUser(
      {
        auth: {
          email,
          password,
          isSubAccount,
          jwt
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

    this.removeUserSessionById(_id)

    return true
  }

  async generateAuthJWT (payload) {
    const {
      _id,
      email,
      encryptedPassword,
      password,
      jwt
    } = { ...payload }
    if (
      email &&
      typeof email === 'string'
    ) {
      if (
        encryptedPassword &&
        typeof encryptedPassword === 'string'
      ) {
        const payload = { _id, email, encryptedPassword }

        return this.generateJWT(payload)
      }
      if (
        password &&
        typeof password === 'string'
      ) {
        const encryptedPassword = await this.encrypt(
          password,
          this.secretKey
        )
        const payload = { _id, email, encryptedPassword }

        return this.generateJWT(payload)
      }

      throw new AuthError()
    }
    if (
      jwt &&
      typeof jwt === 'string'
    ) {
      return jwt
    }

    throw new AuthError()
  }

  async verifyUser (args, params) {
    const { auth } = { ...args }
    const {
      email,
      password,
      isSubAccount,
      jwt
    } = { ...auth }
    const {
      isFilledSubUsers,
      isDecryptedApiKeys,
      isReturnedPassword
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
      const user = await this.getUser(
        { email },
        {
          isNotSubAccount: !isSubAccount,
          isSubAccount,
          isFilledSubUsers,
          ...pwdParam
        }
      )
      const { passwordHash } = { ...user }

      await this.verifyPassword(
        password,
        passwordHash
      )

      return {
        ...user,
        password: isReturnedPassword ? password : null
      }
    }
    if (
      jwt &&
      typeof jwt === 'string'
    ) {
      const {
        _id,
        email: emailFromJWT,
        encryptedPassword
      } = await this.verifyJWT(jwt)
      const decryptedPassword = await this.decrypt(
        encryptedPassword,
        this.secretKey
      )
      const pwdParam = isDecryptedApiKeys
        ? { password: decryptedPassword }
        : {}
      const user = await this.getUser(
        { _id, email: emailFromJWT },
        {
          isFilledSubUsers,
          ...pwdParam
        }
      )
      const { passwordHash } = { ...user }

      await this.verifyPassword(
        decryptedPassword,
        passwordHash
      )

      return {
        ...user,
        password: isReturnedPassword ? decryptedPassword : null
      }
    }

    throw new AuthError()
  }

  async getUser (filter, params) {
    const {
      isFilledSubUsers,
      password
    } = { ...params }

    const user = await this.dao.getUser(filter, params)

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
      emailPasswordsMap
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

    const users = await this.dao.getUsers(filter, params)

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

  async decryptApiKeys (password, users) {
    const isArray = Array.isArray(users)
    const _users = isArray ? users : [users]

    const promises = _users.reduce((accum, user) => {
      const { apiKey, apiSecret } = { ...user }

      return [
        ...accum,
        this.decrypt(apiKey, password),
        this.decrypt(apiSecret, password)
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

  async createUser (data) {
    const { email } = { ...data }

    await this.dao.insertElemsToDb(
      this.TABLES_NAMES.USERS,
      null,
      [data]
    )
    const user = await this.getUser(
      { email },
      { isNotSubAccount: true }
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

  async hashPassword (password, strSalt) {
    const iterations = 10000
    const hashBytes = 32

    const salt = strSalt && typeof strSalt === 'string'
      ? Buffer.from(strSalt, 'hex')
      : await randomBytes(128)
    const hash = await pbkdf2(
      password,
      salt,
      iterations,
      hashBytes,
      this.passwordAlgorithm
    )

    const combinedHash = [
      salt.toString('hex'),
      hash.toString('hex')
    ].join('.')

    return combinedHash
  }

  async verifyPassword (password, conbinedHash) {
    const [salt, hash] = typeof conbinedHash === 'string'
      ? conbinedHash.split('.')
      : []

    if (
      !salt ||
      typeof salt !== 'string' ||
      !hash ||
      typeof hash !== 'string'
    ) {
      throw new AuthError()
    }

    const generatedHash = await this.hashPassword(password, salt)

    if (generatedHash !== conbinedHash) {
      throw new AuthError()
    }
  }

  setUserSession (data) {
    const { _id, email, jwt } = { ...data }

    this.userSessions.set(_id, { _id, email, jwt })
  }

  async getUserSessionById (id, params) {
    const { isFilledUsers } = { ...params }
    const userSession = this.userSessions.get(id)
    const { jwt } = { ...userSession }

    if (isFilledUsers && jwt) {
      const user = await this.verifyUser(
        { auth: { jwt } },
        { isDecryptedApiKeys: true }
      )

      return { ...userSession, ...user, jwt }
    }

    return userSession && typeof userSession === 'object'
      ? { ...userSession }
      : userSession
  }

  async getUserSessions (params) {
    const { isFilledUsers } = { ...params }

    const userSessionsPromises = [...this.userSessions]
      .map(async ([id, session]) => {
        const { jwt } = { ...session }

        if (isFilledUsers && jwt) {
          const user = await this.verifyUser(
            { auth: { jwt } },
            { isDecryptedApiKeys: true }
          )

          return [id, { ...session, ...user, jwt }]
        }

        const userSession = session && typeof session === 'object'
          ? { ...session }
          : session

        return [id, userSession]
      })
    const userSessions = await Promise.all(userSessionsPromises)

    return new Map(userSessions)
  }

  removeUserSessionById (id) {
    return this.userSessions.delete(id)
  }

  generateJWT (payload) {
    return jwtSign(
      payload,
      this.secretKey,
      { algorithm: this.jwtAlgorithm }
    )
  }

  async verifyJWT (token) {
    try {
      return await jwtVerify(token, this.secretKey)
    } catch (err) {
      throw new AuthError()
    }
  }

  scrypt (secret, salt) {
    return scrypt(secret, salt, 32)
  }

  async encrypt (decryptedStr, password) {
    const [key, iv] = await Promise.all([
      this.scrypt(password, this.secretKey),
      randomBytes(32)
    ])
    const cipher = crypto
      .createCipheriv(this.cryptoAlgorithm, key, iv)

    const _encrypted = cipher.update(decryptedStr, 'utf8', 'hex')
    const encrypted = _encrypted + cipher.final('hex')
    const tag = cipher.getAuthTag()

    const combined = [
      iv.toString('hex'),
      encrypted,
      tag.toString('hex')
    ].join('.')

    return combined
  }

  async decrypt (encryptedStr, password) {
    const [strIV, str, strTag] = typeof encryptedStr === 'string'
      ? encryptedStr.split('.')
      : []

    if (
      !str ||
      typeof str !== 'string' ||
      !strIV ||
      typeof strIV !== 'string' ||
      !strTag ||
      typeof strTag !== 'string'
    ) {
      throw new AuthError()
    }

    const key = await this.scrypt(password, this.secretKey)
    const iv = Buffer.from(strIV, 'hex')
    const tag = Buffer.from(strTag, 'hex')
    const decipher = crypto
      .createDecipheriv(this.cryptoAlgorithm, key, iv)
      .setAuthTag(tag)
    const _decrypted = decipher.update(str, 'hex', 'utf8')

    try {
      const decrypted = _decrypted + decipher.final('utf8')

      return decrypted
    } catch (err) {
      throw new AuthError()
    }
  }
}

decorate(injectable(), Authenticator)
decorate(inject(TYPES.DAO), Authenticator, 0)
decorate(inject(TYPES.TABLES_NAMES), Authenticator, 1)
decorate(inject(TYPES.CONF), Authenticator, 2)
decorate(inject(TYPES.RService), Authenticator, 3)

module.exports = Authenticator
