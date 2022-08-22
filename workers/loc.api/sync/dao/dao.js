'use strict'

const {
  ImplementationError
} = require('bfx-report/workers/loc.api/errors')

const {
  DAOInitializationError
} = require('../../errors')

const { decorateInjectable } = require('../../di/utils')

class DAO {
  constructor (
    db,
    TABLES_NAMES,
    syncSchema,
    dbMigratorFactory,
    processMessageManagerFactory
  ) {
    this.db = db
    this.TABLES_NAMES = TABLES_NAMES
    this.syncSchema = syncSchema
    this.dbMigratorFactory = dbMigratorFactory
    this.processMessageManagerFactory = processMessageManagerFactory
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
  async createDBStructure () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async databaseInitialize (db) {
    if (db) this.setDB(db)
    if (!this.db) {
      throw new DAOInitializationError()
    }

    await this.beforeMigrationHook()
    const processMessageManager = this.processMessageManagerFactory()
      .init()
    const pmmJob = processMessageManager.addStateToWait(
      processMessageManager.PROCESS_STATES.PREPARE_DB
    )

    const dbMigrator = this.dbMigratorFactory()
    await dbMigrator.migrateFromCurrToSupportedVer()

    if (!pmmJob.hasTriggered) {
      pmmJob.close(null)
    }

    await pmmJob.promise

    await this.createDBStructure()
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
  async backupDb () { throw new ImplementationError() }

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
  async removeElemsLeaveLastNRecords () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async removeElemsFromDbIfNotInLists () { throw new ImplementationError() }
}

decorateInjectable(DAO)

module.exports = DAO
