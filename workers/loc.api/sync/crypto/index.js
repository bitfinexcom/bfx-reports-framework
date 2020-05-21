'use strict'

const crypto = require('crypto')
const { promisify } = require('util')
const {
  decorate,
  injectable,
  inject
} = require('inversify')
const {
  AuthError
} = require('bfx-report/workers/loc.api/errors')

const TYPES = require('../../di/types')

/**
 * Scrypt was introduced into Node.js in v10.5.0,
 * it can also be used with Node.js v8.5.0...v10.4.1 using the scrypt-js OpenSSL polyfill
 * https://github.com/ricmoo/scrypt-js
 */
if (!crypto.scrypt) {
  const scryptJS = require('scrypt-js')

  crypto.scrypt = (password, salt, keylen, options, cb) => {
    const {
      N = 16384,
      r = 8,
      p = 1
    } = { ...options }
    const _password = Buffer.from(password.normalize('NFKC'))
    const _salt = Buffer.from(salt.normalize('NFKC'))

    scryptJS(_password, _salt, N, r, p, keylen, cb)
  }
}

const scrypt = promisify(crypto.scrypt)
const randomBytes = promisify(crypto.randomBytes)
const pbkdf2 = promisify(crypto.pbkdf2)

class Crypto {
  constructor (CONF) {
    this.CONF = CONF

    const { secretKey } = { ...this.CONF }
    this.secretKey = secretKey

    this.cryptoAlgorithm = 'aes-256-gcm'
    this.passwordAlgorithm = 'sha512'
  }

  getSecretKey () {
    return this.secretKey
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

decorate(injectable(), Crypto)
decorate(inject(TYPES.CONF), Crypto, 0)

module.exports = Crypto
