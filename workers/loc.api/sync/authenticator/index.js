'use strict'

const crypto = require('crypto')
const { promisify } = require('util')
const { omit } = require('lodash')
const jwt = require('jsonwebtoken')
const {
  decorate,
  injectable,
  inject
} = require('inversify')
const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const TYPES = require('../di/types')
const { serializeVal } = require('../dao/helpers')
const { isSubAccountApiKeys } = require('../../helpers')

const scrypt = promisify(crypto.scrypt)
const randomBytes = promisify(crypto.randomBytes)
const pbkdf2 = promisify(crypto.pbkdf2)
const jwtSign = promisify(jwt.sign)

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

    /**
     * It may only work for one grenache worker instance
     */
    this.usersMap = new Map()
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
      { email, isNotSubAccount: true }
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

    const { _id } = await this.createUser({
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
    const jwt = await this.generateJWT(payload)

    this.setUserIntoSession({ _id, email, jwt })

    return { email, jwt }
  }

  async getUser (filter) {
    const { password } = { ...filter }
    const _filter = omit(filter, ['password'])

    const user = await this.dao.getUser(_filter)

    if (
      password &&
      typeof password === 'string' &&
      user &&
      typeof user === 'object'
    ) {
      return this.decryptApiKeys(password, user)
    }

    return user
  }

  /**
   * TODO:
   */
  getUsers (args) {
    return [
      { email: 'fake@email.com', isSubAccount: false }
    ]
  }

  async decryptApiKeys (password, user) {
    const { apiKey, apiSecret } = { ...user }

    const [
      decryptedApiKey,
      decryptedApiSecret
    ] = await Promise.all([
      this.decrypt(apiKey, password),
      this.decrypt(apiSecret, password)
    ])

    return {
      ...user,
      apiKey: decryptedApiKey,
      apiSecret: decryptedApiSecret
    }
  }

  async createUser (data) {
    const { email } = { ...data }

    await this.dao.insertElemsToDb(
      this.TABLES_NAMES.USERS,
      null,
      [data]
    )
    const user = await this.getUser({
      email,
      isNotSubAccount: true
    })

    if (
      !user ||
      typeof user !== 'object' ||
      !Number.isInteger(user._id)
    ) {
      throw new AuthError()
    }

    return user
  }

  async hashPassword (password, salt) {
    const iterations = 10000
    const hashBytes = 32

    const generatedSalt = salt && typeof salt === 'string'
      ? salt
      : await randomBytes(128)
    const hash = await pbkdf2(
      password,
      generatedSalt,
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
    const [strSalt, strHash] = conbinedHash.split('.')

    if (
      !strSalt ||
      typeof strSalt !== 'string' ||
      !strHash ||
      typeof strHash !== 'string'
    ) {
      throw new AuthError()
    }

    const salt = Buffer.from(strSalt, 'hex')
    const generatedHash = await this.hashPassword(password, salt)

    if (generatedHash !== conbinedHash) {
      throw new AuthError()
    }
  }

  setUserIntoSession (data) {
    const { _id, email, jwt } = { ...data }

    this.usersMap.set([_id, { email, jwt }])
  }

  getUserFromSessionById (id) {
    return this.usersMap.get(id)
  }

  async generateJWT (payload) {
    return jwtSign(
      payload,
      this.secretKey,
      { algorithm: this.jwtAlgorithm }
    )
  }

  scrypt (secret, salt) {
    return scrypt(secret, salt, 64)
  }

  async encrypt (decryptedStr, password) {
    const [key, iv] = await Promise.all([
      this.scrypt(password, this.secretKey),
      randomBytes(16)
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
    const [str, strIV, strTag] = encryptedStr.split('.')

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
