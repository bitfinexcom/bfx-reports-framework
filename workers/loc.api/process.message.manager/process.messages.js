'use strict'

module.exports = {
  READY_WORKER: 'ready:worker',
  READY_MIGRATIONS: 'ready:migrations',
  ALL_TABLE_HAVE_BEEN_CLEARED: 'all-tables-have-been-cleared',
  ALL_TABLE_HAVE_NOT_BEEN_CLEARED: 'all-tables-have-not-been-cleared',
  ERROR_MIGRATIONS: 'error:migrations',
  ERROR_BACKUP: 'error:backup',
  BACKUP_PROGRESS: 'backup:progress'
}
