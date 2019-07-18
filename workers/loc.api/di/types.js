'use strict'

const TYPES = require('bfx-report/workers/loc.api/di/types')

module.exports = {
  ...TYPES,
  ALLOWED_COLLS: Symbol.for('ALLOWED_COLLS'),
  GRC_BFX_OPTS: Symbol.for('GRC_BFX_OPTS'),
  ApiMiddlewareHandlerAfter: Symbol.for('ApiMiddlewareHandlerAfter'),
  ApiMiddleware: Symbol.for('ApiMiddleware'),
  DataInserter: Symbol.for('DataInserter'),
  DataInserterFactory: Symbol.for('DataInserterFactory'),
  WSTransport: Symbol.for('WSTransport'),
  WSEventEmitter: Symbol.for('WSEventEmitter'),
  RedirectRequestsToApi: Symbol.for('RedirectRequestsToApi'),
  SyncSchema: Symbol.for('SyncSchema'),
  Sync: Symbol.for('Sync'),
  SyncQueue: Symbol.for('SyncQueue'),
  Progress: Symbol.for('Progress'),
  DAO: Symbol.for('DAO'),
  SqliteDAO: Symbol.for('SqliteDAO'),
  PublicСollsСonfAccessors: Symbol.for('PublicСollsСonfAccessors'),
  SearchClosePriceAndSumAmount: Symbol.for('SearchClosePriceAndSumAmount')
}
