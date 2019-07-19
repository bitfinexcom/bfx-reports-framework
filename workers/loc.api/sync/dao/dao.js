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
    syncSchema,
    prepareResponse
  ) {
    this.db = db
    this.syncSchema = syncSchema
    this.prepareResponse = prepareResponse
  }

  _getModelsMap () {
    return this.syncSchema.getModelsMap()
  }

  _getMethodCollMap () {
    return this.syncSchema.getMethodCollMap()
  }

  setDB (db) {
    this.db = db
  }

  /**
   * @abstract
   */
  databaseInitialize (db) {
    if (db) this.setDB(db)
    if (!this.db) {
      throw new DAOInitializationError()
    }
  }

  /**
   * @abstract
   */
  async getLastElemFromDb () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async insertElemsToDb () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async checkAuthInDb () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async findInCollBy () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async getActiveUsers () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async updateElemsInCollBy () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async updateCollBy () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async insertOrUpdateUser () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async updateUserByAuth () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async deactivateUser () { throw new ImplementationError() }

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
  async updateStateOf () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async getFirstElemInCollBy () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async updateProgress () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async insertElemsToDbIfNotExists () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async removeElemsFromDbIfNotInLists () { throw new ImplementationError() }

  /**
   * @abstract
   */
  async getCountBy () { throw new ImplementationError() }
}

decorate(injectable(), DAO)

module.exports = DAO
