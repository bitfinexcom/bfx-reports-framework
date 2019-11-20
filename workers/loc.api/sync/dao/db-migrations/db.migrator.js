'use strict'

const {
  decorate,
  injectable
} = require('inversify')

const {
  DbMigrationVerCorrectnessError,
  DbVersionTypeError,
  MigrationLaunchingError
} = require('../../../errors')

class DbMigrator {
  constructor (
    migrationsFactory,
    TABLES_NAMES,
    syncSchema
  ) {
    this.migrationsFactory = migrationsFactory
    this.TABLES_NAMES = TABLES_NAMES
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
        this.TABLES_NAMES.DB_CONFIGS,
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

    const isReverse = start > end
    const _start = isReverse
      ? end
      : start
    const _end = isReverse
      ? start
      : end
    const offset = _start + 1

    const range = Array(Math.abs(_end - _start))
      .fill()
      .map((item, i) => offset + i)

    return isReverse
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
    const migrationsData = versions.reduce((accum, version, i) => {
      const migration = migrations[i]

      if (migration) {
        accum.push({ migration, version })
      }

      return accum
    }, [])

    for (const { migration, version } of migrationsData) {
      if (!migration) {
        continue
      }

      try {
        await migration.launch(version, isDown)
      } catch (err) {
        throw new MigrationLaunchingError()
      }
    }
  }

  /**
   * @abstract
   */
  async migrateFromCurrToSupportedVer () {
    const supportedVer = this.getSupportedDbVer()
    const currVer = await this.getCurrDbVer()

    if (
      !Number.isInteger(supportedVer) ||
      !Number.isInteger(currVer)
    ) {
      throw new DbVersionTypeError()
    }
    if (currVer === supportedVer) {
      return
    }

    const isDown = currVer > supportedVer
    const versions = this.range(currVer, supportedVer)

    await this.migrate(versions, isDown)
  }
}

decorate(injectable(), DbMigrator)

module.exports = DbMigrator
