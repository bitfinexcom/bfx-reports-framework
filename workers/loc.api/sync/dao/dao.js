'use strict'

const {
  decorate,
  injectable
} = require('inversify')

const {
  DAOInitializationError,
  ImplementationError
} = require('../../errors')

class DAO {
  constructor (
    db,
    TABLES_NAMES,
    syncSchema,
    dbMigratorFactory
  ) {
    this.db = db
    this.TABLES_NAMES = TABLES_NAMES
    this.syncSchema = syncSchema
    this.dbMigratorFactory = dbMigratorFactory
  }

  _getModelsMap (params) {
    return this.syncSchema.getModelsMap(params)
  }

  _getMethodCollMap (params) {
    return this.syncSchema.getMethodCollMap(params)
  }

  setDB (db) {
    this.db = db
  }

  /**
   * @abstract
   */
  async beforeMigrationHook () {}

  /**
   * @abstract
   */
  async databaseInitialize (db) {
    if (db) this.setDB(db)
    if (!this.db) {
      throw new DAOInitializationError()
    }

    await this.beforeMigrationHook()

    const dbMigrator = this.dbMigratorFactory()
    await dbMigrator.migrateFromCurrToSupportedVer()
  }

  /**
   * @abstract
   */
  async isDBEmpty () {}

  /**
   * @abstract
   */
  async getCurrDbVer () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async setCurrDbVer () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async executeQueriesInTrans () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async insertElemToDb () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async insertElemsToDb () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async findInCollBy () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async updateElemsInCollBy () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async getUser () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async getUsers () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async updateCollBy () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async getElemsInCollBy () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async getElemInCollBy () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async removeElemsFromDb () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async updateRecordOf () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async insertElemsToDbIfNotExists () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async removeElemsFromDbIfNotInLists () { throw new ImplementationError() }
}

decorate(injectable(), DAO)

module.exports = DAO
