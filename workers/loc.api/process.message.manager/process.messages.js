'use strict'

module.exports = {
  READY_WORKER: 'ready:worker',

  READY_MIGRATIONS: 'ready:migrations',
  ERROR_MIGRATIONS: 'error:migrations',

  ALL_TABLE_HAVE_BEEN_CLEARED: 'all-tables-have-been-cleared',
  ALL_TABLE_HAVE_NOT_BEEN_CLEARED: 'all-tables-have-not-been-cleared',
  ALL_TABLE_HAVE_BEEN_REMOVED: 'all-tables-have-been-removed',
  ALL_TABLE_HAVE_NOT_BEEN_REMOVED: 'all-tables-have-not-been-removed',

  BACKUP_PROGRESS: 'backup:progress',
  ERROR_BACKUP: 'error:backup',

  REQUEST_MIGRATION_HAS_FAILED_WHAT_SHOULD_BE_DONE: 'request:migration-has-failed:what-should-be-done',
  REQUEST_SHOULD_ALL_TABLES_BE_REMOVED: 'request:should-all-tables-be-removed'
}
