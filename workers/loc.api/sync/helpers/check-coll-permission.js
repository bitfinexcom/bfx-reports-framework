'use strict'

const {
  CollSyncPermissionError
} = require('../../errors')

module.exports = (
  syncColls,
  ALLOWED_COLLS
) => {
  if (
    !syncColls ||
    !Array.isArray(syncColls) ||
    syncColls.length === 0 ||
    syncColls.some(item => (
      !item ||
      typeof item !== 'string' ||
      Object.values(ALLOWED_COLLS)
        .every(collName => item !== collName)
    ))
  ) {
    throw new CollSyncPermissionError()
  }
}
