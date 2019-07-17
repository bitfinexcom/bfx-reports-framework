'use strict'

const ALLOWED_COLLS = require('../allowed.colls')
const {
  CollSyncPermissionError
} = require('../../errors')

module.exports = (
  syncColls,
  allowedColls = ALLOWED_COLLS
) => {
  if (
    !syncColls ||
    !Array.isArray(syncColls) ||
    syncColls.length === 0 ||
    syncColls.some(item => (
      !item ||
      typeof item !== 'string' ||
      Object.values(allowedColls)
        .every(collName => item !== collName)
    ))
  ) {
    throw new CollSyncPermissionError()
  }
}
