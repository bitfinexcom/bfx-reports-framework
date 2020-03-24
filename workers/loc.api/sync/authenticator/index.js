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

const TYPES = require('../di/types')
const { serializeVal } = require('../dao/helpers')

const scrypt = promisify(crypto.scrypt)
const randomBytes = promisify(crypto.randomBytes)
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
    this.algorithm = 'aes-256-gcm'

    /**
     * It may only work for one grenache worker instance
     */
    this.usersMap = new Map()
  }

  /**
   * TODO:
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
      typeof password !== 'string'
    ) {
      throw new AuthError()
    }

    const {
      email,
      timezone,
      username,
      id
    } = await this.rService._checkAuthInApi(args)

    const [
      encryptedApiKey,
      encryptedApiSecret,
      encryptedPassword
    ] = await Promise.all([
      this.encrypt(apiKey, password),
      this.encrypt(apiSecret, password),
      this.encrypt(password, this.secretKey)
    ])

    const { _id } = await this.createUser({
      email,
      timezone,
      username,
      id,
      apiKey: encryptedApiKey,
      apiSecret: encryptedApiSecret,
      active: serializeVal(active),
      isDataFromDb: serializeVal(isDataFromDb)
    })

    const payload = { _id, email, encryptedPassword }
    const jwt = await this.generateJWT(payload)

    this.setUserIntoSession({ _id, email, jwt })

    return { email, jwt }
  }

  // TODO:
  async createUser (data) {}

  setUserIntoSession (data) {
    const { _id, email, jwt } = { ...data }

    this.usersMap.set([_id, { email, jwt }])
  }

  getUserFromSessionById (id) {
    return this.usersMap.get(id)
  }

  async generateJWT (payload) {
    return jwtSign(payload, this.secretKey, { algorithm: 'HS256' })
  }

  scrypt (secret, salt) {
    return scrypt(secret, salt, 64)
  }

  async encrypt (decryptedStr, password) {
    const key = await this.scrypt(password, this.secretKey)
    const iv = await randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, key, iv)

    const _encrypted = cipher.update(decryptedStr, 'utf8', 'hex')
    const encrypted = _encrypted + cipher.final('hex')
    const tag = cipher.getAuthTag()

    return `${iv.toString('hex')}.${encrypted}.${tag.toString('hex')}`
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
      .createDecipheriv(this.algorithm, key, iv)
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
