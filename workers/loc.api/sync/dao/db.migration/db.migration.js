'use strict'

const {
  decorate,
  injectable
} = require('inversify')

const {
  ImplementationError
} = require('../../../errors')

class DbMigration {
  constructor (
    migrationsFactory,
    syncSchema
  ) {
    this.migrationsFactory = migrationsFactory
    this.syncSchema = syncSchema
  }

  setDao (dao) {
    this.dao = dao
  }

  getSupportedDbVer () {
    return this.syncSchema.SUPPORTED_DB_VERSION
  }

  /**
   * @abstract
   */
  getCurrVersion () { throw new ImplementationError() }

  /**
   * @abstract
   */
  getMigrations () { throw new ImplementationError() }

  /**
   * @abstract
   */
  up () { throw new ImplementationError() }

  /**
   * @abstract
   */
  upFromCurrToSupportedVer () { throw new ImplementationError() }
}

decorate(injectable(), DbMigration)

module.exports = DbMigration
