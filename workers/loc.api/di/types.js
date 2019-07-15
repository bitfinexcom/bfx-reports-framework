'use strict'

const TYPES = require('bfx-report/workers/loc.api/di/types')

module.exports = {
  ...TYPES,
  ALLOWED_COLLS: Symbol.for('ALLOWED_COLLS'),
  GRC_BFX_OPTS: Symbol.for('GRC_BFX_OPTS'),
  DataInserter: Symbol.for('DataInserter'),
  WSTransport: Symbol.for('WSTransport'),
  WSEventEmitter: Symbol.for('WSEventEmitter'),
  Sync: Symbol.for('Sync')
}
