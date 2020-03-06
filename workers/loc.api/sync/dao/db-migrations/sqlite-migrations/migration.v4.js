'use strict'

const AbstractMigration = require('./abstract.migration')
const { getSqlArrToRemoveColumns } = require('./helpers')

class MigrationV4 extends AbstractMigration {
  /**
   * @override
   */
  beforeUp () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  up () {
    const sqlArr = [
      'ALTER TABLE publicСollsСonf ADD COLUMN timeframe VARCHAR(255)',
      'ALTER TABLE candles ADD COLUMN _timeframe VARCHAR(255)',

      `CREATE UNIQUE INDEX candles__symbol__timeframe_mts
        ON candles(_symbol, _timeframe, mts)`,
      'DROP INDEX candles__symbol_mts',
      `CREATE UNIQUE INDEX publicСollsСonf_symbol_user_id_confName_timeframe
        ON publicСollsСonf(symbol, user_id, confName, timeframe)`,
      'DROP INDEX publicСollsСonf_symbol_user_id_confName',

      `CREATE INDEX publicTrades_mts__symbol
        ON publicTrades(mts, _symbol)`,
      `CREATE INDEX statusMessages_timestamp_key
        ON statusMessages(timestamp, key)`,
      `CREATE INDEX candles_mts__symbol
        ON candles(mts, _symbol)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  afterUp () { return this.dao.enableForeignKeys() }

  /**
   * @override
   */
  beforeDown () { return this.dao.disableForeignKeys() }

  /**
   * @override
   */
  down () {
    const sqlArr = [
      'DELETE FROM publicСollsСonf WHERE timeframe != 1D',
      'DELETE FROM candles WHERE _timeframe != 1D',

      'DROP INDEX publicTrades_mts__symbol',
      'DROP INDEX statusMessages_timestamp_key',
      'DROP INDEX candles_mts__symbol',
      'DROP INDEX candles__symbol__timeframe_mts',
      'DROP INDEX publicСollsСonf_symbol_user_id_confName_timeframe',

      ...getSqlArrToRemoveColumns(
        'publicСollsСonf',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          confName: 'VARCHAR(255)',
          symbol: 'VARCHAR(255)',
          start: 'BIGINT',
          user_id: 'INT NOT NULL',
          __constraints__: `CONSTRAINT #{tableName}_fk_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(_id)
            ON UPDATE CASCADE
            ON DELETE CASCADE`
        }
      ),
      ...getSqlArrToRemoveColumns(
        'candles',
        {
          _id: 'INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT',
          mts: 'BIGINT',
          open: 'DECIMAL(22,12)',
          close: 'DECIMAL(22,12)',
          high: 'DECIMAL(22,12)',
          low: 'DECIMAL(22,12)',
          volume: 'DECIMAL(22,12)',
          _symbol: 'VARCHAR(255)'
        }
      ),

      `CREATE UNIQUE INDEX candles__symbol_mts
        ON candles(_symbol, mts)`,
      `CREATE UNIQUE INDEX publicСollsСonf_symbol_user_id_confName
        ON publicСollsСonf(symbol, user_id, confName)`
    ]

    this.addSql(sqlArr)
  }

  /**
   * @override
   */
  afterDown () { return this.dao.enableForeignKeys() }
}

module.exports = MigrationV4
