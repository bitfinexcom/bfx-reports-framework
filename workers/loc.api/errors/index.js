'use strict'

const {
  BaseError,
  AuthError,
  ConflictError,
  ArgsParamsError
} = require('bfx-report/workers/loc.api/errors')

class CollSyncPermissionError extends BaseError {
  constructor (message = 'ERR_PERMISSION_DENIED_TO_SYNC_SELECTED_COLL') {
    super(message)
  }
}

class UpdateSyncQueueJobError extends BaseError {
  constructor (id) {
    super(`ERR_CAN_NOT_UPDATE_SYNC_QUEUE_JOB_BY_ID_${id}`)
  }
}

class AsyncProgressHandlerIsNotFnError extends BaseError {
  constructor (message = 'ERR_ASYNC_PROGRESS_HANDLER_IS_NOT_FUNCTION') {
    super(message)
  }
}

class AfterAllInsertsHookIsNotHookError extends BaseError {
  constructor (message = 'ERR_AFTER_ALL_INSERTS_HOOK_IS_NOT_HOOK') {
    super(message)
  }
}

class RemoveListElemsError extends BaseError {
  constructor (message = 'ERR_LIST_IS_NOT_ARRAY') {
    super(message)
  }
}

class RemoveElemsLeaveLastNRecordsError extends BaseError {
  constructor (message = 'ERR_STORE_ROWS_LIMIT_MUST_BE_MORE_THAN_0') {
    super(message)
  }
}

class UpdateRecordError extends BaseError {
  constructor (name) {
    const recordName = name && typeof name === 'string'
      ? `_OF_${name.toUpperCase()}`
      : ''

    super(`ERR_CAN_NOT_UPDATE_RECORD${recordName}`)
  }
}

class DAOInitializationError extends BaseError {
  constructor (message = 'ERR_DAO_NOT_INITIALIZED') {
    super(message)
  }
}

class ServerAvailabilityError extends BaseError {
  constructor (restUrl) {
    super(`ERR_SERVER_${restUrl}_IS_NOT_AVAILABLE`)

    this.statusMessage = `The server ${restUrl} is not available`
  }
}

class ObjectMappingError extends BaseError {
  constructor (message = 'ERR_MAPPING_AN_OBJECT_BY_THE_SCHEMA') {
    super(message)
  }
}

class CurrencyConversionDataFindingError extends BaseError {
  constructor (message = 'ERR_DATA_IS_NOT_FOUND_TO_CONVERT_CURRENCY') {
    super(message)
  }
}

class SqlCorrectnessError extends BaseError {
  constructor (message = 'ERR_SQL_IS_NOT_CORRECT') {
    super(message)
  }
}

class DbMigrationVerCorrectnessError extends BaseError {
  constructor (message = 'ERR_DB_MIGRATION_VERSION_IS_NOT_CORRECT') {
    super(message)
  }
}

class DbVersionTypeError extends BaseError {
  constructor (message = 'ERR_DB_VERSION_IS_NOT_INTEGER') {
    super(message)
  }
}

class MigrationLaunchingError extends BaseError {
  constructor (message = 'ERR_DB_MIGRATION_HAS_BEEN_FAILED') {
    super(message)
  }
}

class SubAccountCreatingError extends AuthError {
  constructor (message = 'ERR_SUB_ACCOUNT_CREATION_HAS_BEEN_FAILED') {
    super(message)

    this.statusMessage = 'Sub account creation has been failed'
  }
}

class SubAccountUpdatingError extends AuthError {
  constructor (message = 'ERR_SUB_ACCOUNT_UPDATE_HAS_BEEN_FAILED') {
    super(message)

    this.statusMessage = 'Sub account update has been failed'
  }
}

class UserRemovingError extends AuthError {
  constructor (message = 'ERR_USER_REMOVE_HAS_BEEN_FAILED') {
    super(message)

    this.statusMessage = 'User remove has been failed'
  }
}

class UserWasPreviouslyStoredInDbError extends AuthError {
  constructor (message = 'ERR_USER_WAS_PREVIOUSLY_STORED_IN_DB') {
    super(message)

    this.statusMessage = 'User was previously stored in DB'
  }
}

class SubAccountLedgersBalancesRecalcError extends BaseError {
  constructor (message = 'ERR_SUB_ACCOUNT_LEDGERS_BALANCES_RECALC_HAS_BEEN_FAILED') {
    super(message)
  }
}

class DatePropNameError extends BaseError {
  constructor (message = 'ERR_DATE_PROP_NAME_IS_EMPTY_OR_NOT_STRING') {
    super(message)
  }
}

class GetPublicDataError extends BaseError {
  constructor (message = 'ERR_GETTING_PUBLIC_DATA_HAS_BEEN_FAILED') {
    super(message)
  }
}

class DataConsistencyCheckerFindingError extends BaseError {
  constructor (message = 'ERR_DATA_CONSISTENCY_CHECKER_HAS_NOT_BEEN_FOUND') {
    super(message)
  }
}

class DataConsistencyError extends ConflictError {
  constructor (message = 'ERR_COLLECTIONS_DATA_IS_NOT_CONSISTENT') {
    super(message)

    this.statusMessage = 'The db has inconsistent data, please force sync and wait for end and then try again'
  }
}

class DataConsistencyWhileSyncingError extends DataConsistencyError {
  constructor (message = 'ERR_COLLECTIONS_DATA_IS_NOT_CONSISTENT_WHILE_SYNCING') {
    super(message)

    this.statusMessage = 'This particular endpoints are not available for the selected time frame while DB is being synced'
  }
}

class ProcessStateSendingError extends BaseError {
  constructor (message = 'ERR_PROCESS_STATE_SENDING_IS_NOT_CORRECT') {
    super(message)
  }
}

class DbRestoringError extends BaseError {
  constructor (message = 'ERR_DB_HAS_NOT_BEEN_RESTORED') {
    super(message)
  }
}

class TotalFeesParamsFlagError extends ArgsParamsError {
  constructor (message = 'ERR_TOTAL_FEES_REPORT_PARAMS_FLAGS_MUST_HAVE_AT_LEAST_ONCE_TRUE_VALUE') {
    super(message)
  }
}

module.exports = {
  BaseError,
  CollSyncPermissionError,
  UpdateSyncQueueJobError,
  AsyncProgressHandlerIsNotFnError,
  AfterAllInsertsHookIsNotHookError,
  RemoveListElemsError,
  RemoveElemsLeaveLastNRecordsError,
  UpdateRecordError,
  DAOInitializationError,
  ServerAvailabilityError,
  ObjectMappingError,
  CurrencyConversionDataFindingError,
  SqlCorrectnessError,
  DbMigrationVerCorrectnessError,
  DbVersionTypeError,
  MigrationLaunchingError,
  SubAccountCreatingError,
  SubAccountUpdatingError,
  UserRemovingError,
  UserWasPreviouslyStoredInDbError,
  SubAccountLedgersBalancesRecalcError,
  DatePropNameError,
  GetPublicDataError,
  DataConsistencyCheckerFindingError,
  DataConsistencyError,
  DataConsistencyWhileSyncingError,
  ProcessStateSendingError,
  DbRestoringError,
  TotalFeesParamsFlagError
}
