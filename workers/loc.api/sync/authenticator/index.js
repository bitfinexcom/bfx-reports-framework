'use strict'

const {
  decorate,
  injectable,
  inject
} = require('inversify')

const TYPES = require('../di/types')

class Authenticator {
  constructor (
    dao,
    TABLES_NAMES
  ) {
    this.dao = dao
    this.TABLES_NAMES = TABLES_NAMES
  }
}

decorate(injectable(), Authenticator)
decorate(inject(TYPES.DAO), Authenticator, 0)
decorate(inject(TYPES.TABLES_NAMES), Authenticator, 1)

module.exports = Authenticator
