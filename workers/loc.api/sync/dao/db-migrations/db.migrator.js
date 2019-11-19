'use strict'

const {
  decorate,
  injectable
} = require('inversify')

const {
  ImplementationError,
  DbMigrationVerCorrectnessError,
  DbVersionTypeError
} = require('../../../errors')

class DbMigrator {
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

  async getCurrDbVer () {
    try {
      const dbConfigs = await this.dao.getElemInCollBy(
        'dbConfigs',
        null,
        [['version', -1]]
      )
      const { version } = { ...dbConfigs }

      return Number.isInteger(version)
        ? version
        : 0
    } catch (err) {
      return 0
    }
  }

  getMigrations (versions = [1]) {
    return this.migrationsFactory(versions)
  }

  range (start = 0, end) {
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end)
    ) {
      throw new DbVersionTypeError()
    }

    const isRevert = start > end
    const _start = isRevert
      ? end
      : start
    const _end = isRevert
      ? start
      : end
    const offset = _start + 1

    const range = Array(Math.abs(_end - _start))
      .fill()
      .map((item, i) => offset + i)

    return isRevert
      ? range.reverse()
      : range
  }

  async migrate (ver, isDown) {
    if (
      !Number.isInteger(ver) &&
      !Array.isArray(ver)
    ) {
      throw new DbMigrationVerCorrectnessError()
    }

    const versions = Array.isArray(ver)
      ? ver
      : [ver]
    const migrations = this.getMigrations(versions)

    for (const migration of migrations) {
      if (!migration) {
        continue
      }

      await migration.launch(isDown)
    }
  }

  /**
   * @abstract
   */
  migrateFromCurrToSupportedVer () { throw new ImplementationError() }
}

decorate(injectable(), DbMigrator)

module.exports = DbMigrator
