'use strict'

module.exports = {
  READY_WORKER: 'ready:worker',
  ERROR_WORKER: 'error:worker', // Uses in bfx-report

  READY_MIGRATIONS: 'ready:migrations',
  ERROR_MIGRATIONS: 'error:migrations',

  ALL_TABLE_HAVE_BEEN_CLEARED: 'all-tables-have-been-cleared',
  ALL_TABLE_HAVE_NOT_BEEN_CLEARED: 'all-tables-have-not-been-cleared',
  ALL_TABLE_HAVE_BEEN_REMOVED: 'all-tables-have-been-removed',
  ALL_TABLE_HAVE_NOT_BEEN_REMOVED: 'all-tables-have-not-been-removed',

  BACKUP_STARTED: 'backup:started',
  BACKUP_PROGRESS: 'backup:progress',
  BACKUP_FINISHED: 'backup:finished',
  ERROR_BACKUP: 'error:backup',

  DB_HAS_BEEN_RESTORED: 'db-has-been-restored',
  DB_HAS_NOT_BEEN_RESTORED: 'db-has-not-been-restored',

  DB_HAS_NOT_BEEN_PREPARED: 'db-has-not-been-prepared',
  DB_HAS_BEEN_PREPARED: 'db-has-been-prepared',

  REQUEST_MIGRATION_HAS_FAILED_WHAT_SHOULD_BE_DONE: 'request:migration-has-failed:what-should-be-done',
  REQUEST_SHOULD_ALL_TABLES_BE_REMOVED: 'request:should-all-tables-be-removed',

  RESPONSE_GET_BACKUP_FILES_METADATA: 'response:get-backup-files-metadata',

  RESPONSE_UPDATE_USERS_SYNC_ON_STARTUP_REQUIRED_STATE: 'response:update-users-sync-on-startup-required-state',

  REQUEST_PDF_CREATION: 'request:pdf-creation'
}
